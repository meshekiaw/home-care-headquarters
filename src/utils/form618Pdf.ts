import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { FIELD_RECTS } from "./form618Fields";
import {
  asciiSafe,
  downloadPdf,
  flatten,
  loadBlank,
  printPdf,
  stampEveryPage,
  stampSignature,
  textWidth,
  wrapText,
  type FillMode,
} from "./pdfFillShared";

const BLANK_URL = "/forms/dms-618-8-23.pdf";
const H = 792;
const CONT_NOTE = " (continued on attached page)";

export interface Form618Signature {
  signature_slot: string;
  signer_type: string;
  signer_name: string;
  signature_data: string;
  signed_at: string;
}

export interface Form618AgencyDefaults {
  provider_name: string;
  provider_id_number: string;
  mailing_address: string;
  referral_source: string;
  projected_end_date_of_service: string;
  attending_physician: string;
  attending_physician_provider_id: string;
  section_xi_certification: string;
  section_xi_comments: string;
}

export type HelpLevel = "No Help" | "Partial Help" | "Total Help";
export type AdlLevel = "Needs no help" | "Needs partial help" | "Physically incapable";

export interface Form618PdfInput {
  clientName: string;
  medicaidId?: string;
  dateOfBirth?: string;
  status: string;
  version: number;
  assessmentDate?: string;
  rnName?: string;
  notes?: string;

  /** Section I - client identification beyond name and date of birth. */
  county?: string;
  phone?: string;
  guardianName?: string;
  mailingAddress?: string;
  planStatus?: "Initial" | "Revision" | "Renewal";
  residesType?: string;
  residesOther1?: string;
  residesOther2?: string;
  pcpName?: string;
  pcpProviderId?: string;
  pcpLastExamDate?: string;

  /** Section II - service locations. */
  serviceLocationType?: string;
  serviceLocationOther?: string;
  serviceAddress1?: string;
  serviceAddress2?: string;

  /** Section III - dates of service. */
  startOfCareOriginal?: string;
  startOfCarePlan?: string;
  referralOrderDate?: string;

  /** Section V - up to 4 rows print on the form, the rest continue on the attachment. */
  diagnoses?: { icd_code?: string; description?: string }[];

  /** Section VI - mental status checkboxes plus comments. */
  mentalStatus?: string[];
  mentalStatusComments?: string;

  /** Special Administrative Section - up to 3 procedure rows. */
  procedures?: { code?: string; hours?: string; minutes?: string; frequency?: string }[];

  /** Section VII - bedridden / ambulation / continence / training checkboxes. */
  physical?: string[];
  bathingTypes?: string[];
  grooming?: Partial<Record<"Bathing" | "Dressing" | "Shaving" | "Care of hair", HelpLevel>>;
  eating?: string[];
  meals?: string[];

  /** Section VIII - activities of daily living. */
  adl?: Partial<Record<"Laundry" | "Housekeeping" | "Shopping", AdlLevel>>;

  /** Section X. */
  alternateResources?: string;

  /** Section XI - daily and weekly service-time totals. */
  serviceTime?: {
    max?: (string | undefined)[];
    min?: (string | undefined)[];
    weeklyMax?: string;
    weeklyMin?: string;
  };

  sectionXII?: {
    tasks: Record<string, { minutes?: string; days_per_week?: string }>;
    notes?: string;
  };
  totalMinutes?: number | string;

  /** Section XIII - service plan continuation text. */
  sectionXIIIPlan?: string;

  defaults?: Form618AgencyDefaults | null;
  /** Section XIV extension of benefits request (page 7). Left blank when not requested. */
  extension?: {
    additional_service_time_increments?: string;
    begin_date_of_service?: string;
    end_date_of_service?: string;
  } | null;
  signatures: Form618Signature[];
}

/* ------------------------------------------------------------------ drawing */

const y = (top: number) => H - top;

function rect(pageNum: number, name: string): [number, number, number, number] {
  const r = FIELD_RECTS[pageNum]?.[name];
  if (!r) throw new Error(`No DMS-618 field "${name}" on page ${pageNum}`);
  return r;
}

/** Print a value inside one of the state's own field rectangles. */
function fld(
  page: PDFPage,
  font: PDFFont,
  pageNum: number,
  name: string,
  value: unknown,
  size = 9,
) {
  const text = asciiSafe(value);
  if (!text) return;
  const [x0, y0, x1, y1] = rect(pageNum, name);
  const avail = x1 - x0 - 5;
  let s = size;
  while (s > 6 && textWidth(font, text, s) > avail) s -= 0.25;
  const h = y1 - y0;
  const base = y0 + (bottomAlign || h <= 15 ? 3.2 : (h - s) / 2 + 1);
  page.drawText(text, { x: x0 + 2.5, y: base, size: s, font, color: rgb(0, 0, 0) });
}

/** Flow long text down a run of printed lines; returns whatever did not fit. */
function flowFields(
  page: PDFPage,
  font: PDFFont,
  pageNum: number,
  names: string[],
  value: string | undefined,
  size = 9,
  forceNote = false,
): string {
  const text = asciiSafe(value);
  if (!text && !forceNote) return "";
  const widths = names.map((n) => {
    const [x0, , x1] = rect(pageNum, n);
    return x1 - x0 - 5;
  });
  const lines: string[] = [];
  let line = "";
  let i = 0;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${w}` : w;
    if (textWidth(font, trial, size) > widths[Math.min(i, widths.length - 1)] && line) {
      lines.push(line);
      i += 1;
      line = w;
    } else {
      line = trial;
    }
  }
  lines.push(line);
  let overflow = lines.slice(names.length);
  const shown = lines.slice(0, names.length);
  if ((overflow.length || forceNote) && shown.length) {
    const last = shown.length - 1;
    const room =
      widths[Math.min(last, widths.length - 1)] - textWidth(font, CONT_NOTE, size);
    const words = shown[last].split(" ");
    const moved: string[] = [];
    while (words.length && textWidth(font, words.join(" "), size) > room) {
      moved.unshift(words.pop() as string);
    }
    shown[last] = `${words.join(" ")}${CONT_NOTE}`.trim();
    if (moved.length) overflow = [moved.join(" "), ...overflow];
  }
  shown.forEach((ln, idx) => {
    if (ln) fld(page, font, pageNum, names[idx], ln, size);
  });
  return overflow.join(" ");
}

/** Stamp an X into a printed checkbox, positioned from the box glyph itself. */
function tick(page: PDFPage, bold: PDFFont, boxX: number, boxTop: number) {
  page.drawText("X", { x: boxX + 1.5, y: y(boxTop) - 9, size: 10, font: bold, color: rgb(0, 0, 0) });
}

/** Print at a measured position on a printed rule. */
function onAt(
  page: PDFPage,
  font: PDFFont,
  x: number,
  top: number,
  value: unknown,
  size = 9,
) {
  const text = asciiSafe(value);
  if (!text) return;
  page.drawText(text, { x, y: y(top) + 2.6, size, font, color: rgb(0, 0, 0) });
}

async function sigInto(
  doc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  pageNum: number,
  field: string,
  s: Form618Signature | undefined,
  inset = 8,
) {
  if (!s) return;
  const [x0, y0, x1] = rect(pageNum, field);
  const width = Math.min(x1 - x0 - inset * 2, 190);
  await stampSignature(doc, page, font, s.signature_data, "", {
    x: x0 + inset,
    y: y0 + 2,
    width,
    height: 12,
  });
  page.drawText(
    asciiSafe(`${s.signer_name} - signed electronically ${new Date(s.signed_at).toLocaleDateString()}`),
    { x: x0 + inset, y: y0 + 15, size: 6, font, color: rgb(0.3, 0.3, 0.3) },
  );
}

/* -------------------------------------------------- printed checkbox anchors */

const PLAN_STATUS: Record<string, [number, number]> = {
  Initial: [355.5, 117.4],
  Revision: [441.0, 117.4],
  Renewal: [519.3, 117.4],
};

const RESIDES: Record<string, [number, number]> = {
  Alone: [174.6, 250.9],
  "With Relatives": [233.1, 250.9],
  "Boarding Home": [332.1, 250.9],
  "Group Home": [444.6, 250.9],
  "Community-Based Residential Home": [99.2, 266.5],
  "Residential Care Facility": [315.3, 266.5],
  Other: [99.0, 284.5],
};

const SERVICE_LOCATION: Record<string, [number, number]> = {
  "Private Residence": [269.1, 468.5],
  "Residential Care Facility": [382.5, 468.5],
  School: [90.0, 483.7],
  "DDS Facility": [144.0, 483.7],
  Other: [229.5, 483.7],
};

const MENTAL_STATUS: Record<string, [number, number]> = {
  Clear: [111.6, 426.7],
  Hyperactive: [309.6, 426.7],
  "Somewhat confused": [111.6, 444.1],
  Withdrawn: [309.6, 444.1],
  "Moderately confused": [111.6, 461.6],
  "Needs restraint": [309.6, 461.6],
  "Markedly confused": [111.6, 479.1],
  "Needs supervision for personal safety": [309.6, 479.1],
};

const PHYSICAL: Record<string, [number, number]> = {
  // Bedridden
  Bedfast: [79.2, 160.9],
  "Requires turning in bed": [79.2, 175.4],
  "Bed to chair with help": [79.2, 192.9],
  "Bed to chair without help": [79.2, 210.4],
  "Must be lifted into chair": [79.2, 227.9],
  // Ambulation
  "Walks alone": [244.8, 160.9],
  "Walks with device": [244.8, 175.4],
  "Walks with help": [244.8, 192.9],
  "Wheelchair (self)": [244.8, 210.4],
  "Wheelchair (push)": [244.8, 227.9],
  "Motorized chair": [244.8, 245.4],
  // Continence
  Catheter: [381.6, 160.9],
  Colostomy: [459.9, 160.9],
  Incontinent: [423.5, 175.4],
  Bladder: [381.6, 189.9],
  Bowels: [459.0, 189.9],
  // Training
  "Cannot Train": [410.4, 219.2],
  Trained: [410.4, 233.6],
  "Needs Training": [410.4, 248.1],
};

const BATHING_TYPE: Record<string, [number, number]> = {
  Tub: [148.5, 310.7],
  Shower: [198.0, 310.7],
  Bed: [265.5, 310.7],
};

const GROOMING_ROWS: Record<string, number> = {
  Bathing: 311.3,
  Dressing: 326.4,
  Shaving: 341.5,
  "Care of hair": 356.6,
};
const GROOMING_COLS: Record<HelpLevel, number> = {
  "No Help": 362.7,
  "Partial Help": 431.1,
  "Total Help": 503.1,
};

const EATING: Record<string, [number, number]> = {
  "Has physical ability to eat without help.": [90.0, 414.7],
  "Needs partial help to eat.": [90.0, 429.2],
  "Needs help with eating:": [90.0, 443.6],
  "Special diet.": [108.0, 458.2],
  "Cannot cut food into bite-size pieces.": [108.0, 472.7],
  "Cannot bring food from plate to mouth.": [108.0, 487.1],
};

const MEALS: Record<string, [number, number]> = {
  "Has physical ability to cook or prepare food without help.": [320.4, 414.7],
  "Needs partial help with meal preparation.": [320.4, 443.6],
  "Physically incapable of cooking or preparing meals.": [320.4, 461.2],
};

const ADL_COLS: Record<string, number> = { Laundry: 84.6, Housekeeping: 232.2, Shopping: 397.8 };
const ADL_ROWS: Record<AdlLevel, number> = {
  "Needs no help": 571.1,
  "Needs partial help": 585.7,
  "Physically incapable": 600.2,
};

const SECTION_XII_ROWS: { task: string; rule: number }[] = [
  { task: "Eating", rule: 576.6 },
  { task: "Bathing", rule: 588.2 },
  { task: "Grooming", rule: 599.6 },
  { task: "Tolieting", rule: 611.1 },
  { task: "Dressing", rule: 622.7 },
  { task: "Transfer/Mobility", rule: 634.1 },
  { task: "Housekeeping", rule: 645.6 },
  { task: "Laundry", rule: 657.2 },
];

const HEADER_FIELDS: Record<number, [string, string]> = {
  2: ["Clients Name", "Medicaid ID_2"],
  3: ["Clients Name_2", "Medicaid ID_3"],
  4: ["Clients Name_3", "Medicaid ID_4"],
  5: ["Clients Name_4", "Medicaid ID_5"],
  6: ["Clients Name_5", "Medicaid ID_6"],
  7: ["Clients Name_6", "Medicaid ID_7"],
};

/* --------------------------------------------------------------------- build */

export async function buildForm618Pdf(input: Form618PdfInput): Promise<Uint8Array> {
  const mode: FillMode = input.status === "draft" ? "draft" : "final";
  const doc = await loadBlank(BLANK_URL);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const d = input.defaults;
  const mid = input.medicaidId || "";
  const sig = (slot: string) => input.signatures.find((s) => s.signature_slot === slot);

  // Repeating header: client name and Medicaid ID on pages 2-7.
  for (const [num, names] of Object.entries(HEADER_FIELDS)) {
    const p = pages[Number(num) - 1];
    if (!p) continue;
    // header rectangles are taller than the printed rule on some pages, so the
    // value is pinned to the bottom of the box to sit on the line
    fld(p, font, Number(num), names[0], input.clientName, 9.5, true);
    fld(p, font, Number(num), names[1], mid, 9.5, true);
  }

  /* ---------------------------------------------------------------- page 1 */
  const p1 = pages[0];
  fld(p1, font, 1, "Medicaid ID", mid, 9.5);
  fld(p1, font, 1, "Name LastFirstMiddle", input.clientName, 9.5);
  fld(p1, font, 1, "Date Of Birth MMDDYYYY", input.dateOfBirth, 9.5);
  fld(p1, font, 1, "County of Residence", input.county, 9.5);
  fld(p1, font, 1, "Telephone Numbers", input.phone, 9.5);
  fld(p1, font, 1, "Parents  Guardians Names", input.guardianName, 9);
  fld(p1, font, 1, "Complete Mailing Address", input.mailingAddress, 9.5);
  if (input.planStatus && PLAN_STATUS[input.planStatus]) {
    tick(p1, bold, ...PLAN_STATUS[input.planStatus]);
  }
  if (input.residesType && RESIDES[input.residesType]) {
    tick(p1, bold, ...RESIDES[input.residesType]);
  }
  fld(p1, font, 1, "fill_1", input.residesOther1, 9);
  fld(p1, font, 1, "fill_2", input.residesOther2, 9);
  fld(p1, font, 1, "Name", input.pcpName, 9);
  fld(p1, font, 1, "Provider ID NumberTaxonomy Code", input.pcpProviderId, 9);
  fld(p1, font, 1, "Date Of Last Exam", input.pcpLastExamDate, 9);
  if (input.serviceLocationType && SERVICE_LOCATION[input.serviceLocationType]) {
    tick(p1, bold, ...SERVICE_LOCATION[input.serviceLocationType]);
  }
  fld(p1, font, 1, "fill_3", input.serviceLocationOther, 9);
  fld(p1, font, 1, "Service Locations Addresses 1", input.serviceAddress1, 9);
  fld(p1, font, 1, "Service Locations Addresses 2", input.serviceAddress2, 9);
  fld(p1, font, 1, "Required", input.startOfCareOriginal, 9);
  fld(p1, font, 1, "Service Plan", input.startOfCarePlan, 9);
  fld(p1, font, 1, "Current Assessment Date", input.assessmentDate, 9);
  fld(p1, font, 1, "Assessing RN", input.rnName, 9);
  fld(p1, font, 1, "Date of the Order or Referral for Assessment", input.referralOrderDate, 9);
  if (d) {
    fld(p1, font, 1, "Name Home Care Network LLC", d.provider_name, 9.5);
    onAt(p1, font, 185, 415, d.provider_id_number, 8.5);
    onAt(p1, font, 372, 423, d.mailing_address, 9);
    onAt(p1, font, 335, 616.7, d.projected_end_date_of_service, 9);
    onAt(p1, font, 354, 648.7, d.attending_physician, 9);
    onAt(p1, font, 358, 664.7, d.attending_physician_provider_id, 9);
    onAt(p1, font, 300, 696.7, d.referral_source, 9);
  }

  /* ---------------------------------------------------------------- page 2 */
  const p2 = pages[1];
  const sec4Client = sig("sec4_client");
  await sigInto(doc, p2, font, 2, "Signature", sec4Client, 14);
  if (sec4Client) {
    fld(
      p2,
      font,
      2,
      "medical information by or to the attending physician andor the PCP named above",
      new Date(sec4Client.signed_at).toLocaleDateString(),
      9.5,
    );
  }
  await sigInto(doc, p2, font, 2, "Client or Clients Representative", sig("sec4_witness_1"), 4);
  await sigInto(doc, p2, font, 2, "Witness Signature", sig("sec4_witness_2"), 4);

  // Section V - four printed rows, extras go to the continuation page.
  const diags = input.diagnoses ?? [];
  const diagOverflow = diags.slice(4);
  diags.slice(0, 4).forEach((dx, i) => {
    const last = i === 3 && diagOverflow.length > 0;
    fld(p2, font, 2, `ICD Code ${i + 1}`, dx.icd_code, 9);
    fld(p2, font, 2, `Description ${i + 1}`, `${dx.description ?? ""}${last ? CONT_NOTE : ""}`, 9);
  });

  for (const key of input.mentalStatus ?? []) {
    const box = MENTAL_STATUS[key];
    if (box) tick(p2, bold, box[0], box[1]);
  }
  const mentalOverflow = flowFields(
    p2,
    font,
    2,
    ["Markedly confused", "Comments 1", "Comments 2", "Comments 3"],
    input.mentalStatusComments,
    8.5,
  );

  (input.procedures ?? []).slice(0, 3).forEach((row, i) => {
    const n = i + 1;
    fld(p2, font, 2, `Requested ${n}`, row.code, 9);
    fld(p2, font, 2, `Hours ${n}`, row.hours, 9);
    fld(p2, font, 2, `Minutes ${n}`, row.minutes, 9);
    fld(p2, font, 2, `Frequency ${n}`, row.frequency, 9);
  });

  /* ---------------------------------------------------------------- page 3 */
  const p3 = pages[2];
  for (const key of input.physical ?? []) {
    const box = PHYSICAL[key];
    if (box) tick(p3, bold, box[0], box[1]);
  }
  for (const key of input.bathingTypes ?? []) {
    const box = BATHING_TYPE[key];
    if (box) tick(p3, bold, box[0], box[1]);
  }
  for (const [row, level] of Object.entries(input.grooming ?? {})) {
    const top = GROOMING_ROWS[row];
    const x = level ? GROOMING_COLS[level] : undefined;
    if (top && x) tick(p3, bold, x, top);
  }
  for (const key of input.eating ?? []) {
    const box = EATING[key];
    if (box) tick(p3, bold, box[0], box[1]);
  }
  for (const key of input.meals ?? []) {
    const box = MEALS[key];
    if (box) tick(p3, bold, box[0], box[1]);
  }
  for (const [col, level] of Object.entries(input.adl ?? {})) {
    const x = ADL_COLS[col];
    const top = level ? ADL_ROWS[level] : undefined;
    if (x && top) tick(p3, bold, x, top);
  }

  /* ---------------------------------------------------------------- page 4 */
  const p4 = pages[3];
  const narrNames = Array.from({ length: 30 }, (_, i) => `IX ${i + 1}`);
  const narrOverflow = flowFields(p4, font, 4, narrNames, input.notes, 9);
  const altBase =
    "instructions found in the Personal Care provider manual Attach additional pages as necessary to give a full account";
  const altNames = Array.from({ length: 12 }, (_, i) => `${altBase} ${i + 1}`);
  const altOverflow = flowFields(p4, font, 4, altNames, input.alternateResources, 9);

  /* ---------------------------------------------------------------- page 5 */
  const p5 = pages[4];
  if (d) {
    const cert = wrapText(font, d.section_xi_certification, 9, 450);
    // the first line shares the printed "I certify that ... required to:" rule
    onAt(p5, font, 281, 135, cert[0], 9);
    if (cert.length > 1) {
      flowFields(
        p5,
        font,
        5,
        [
          "I certify that personal care services are required to 2",
          "I certify that personal care services are required to 3",
        ],
        cert.slice(1).join(" "),
        9,
      );
    }
    onAt(p5, font, 78, 413.6, d.section_xi_comments, 9);
  }

  const st = input.serviceTime;
  for (let i = 0; i < 7; i += 1) {
    fld(p5, font, 5, `${i + 1}Maximum`, st?.max?.[i], 9);
    fld(p5, font, 5, `${i + 1}Minimum`, st?.min?.[i], 9);
  }
  fld(p5, font, 5, "Maximum", st?.weeklyMax, 9);
  fld(p5, font, 5, "Minimum", st?.weeklyMin, 9);

  await sigInto(doc, p5, font, 5, "Registered Nurses Signature and Date", sig("sec11_nurse"), 10);

  // Section XII task table: this blank does not print the table labels, so they
  // are drawn back on alongside our values.
  const label = (x: number, rule: number, text: string, size = 8.5) =>
    p5.drawText(text, { x, y: y(rule) + 2.6, size, font: bold, color: rgb(0, 0, 0) });
  label(117, 564.9, "Tasks:");
  label(200, 564.9, "Minutes:");
  label(262, 564.9, "Days/wk:");
  let total = 0;
  for (const { task, rule } of SECTION_XII_ROWS) {
    const entry = input.sectionXII?.tasks?.[task];
    total += Number.parseInt(String(entry?.minutes ?? "0"), 10) || 0;
    p5.drawText(task, { x: 117, y: y(rule) + 2.6, size: 8.5, font, color: rgb(0, 0, 0) });
    onAt(p5, font, 203, rule, entry?.minutes, 8.5);
    onAt(p5, font, 265, rule, entry?.days_per_week, 8.5);
  }
  label(140, 680.4, "Total Minutes:");
  onAt(p5, font, 215, 680.4, String(total || ""), 9);
  const sec12Overflow = flowFields(p5, font, 5, ["1", "2", "3"], input.sectionXII?.notes, 8.5);

  /* ---------------------------------------------------------------- page 6 */
  const p6 = pages[5];
  const planNames = Array.from({ length: 20 }, (_, i) => `XIII ${i + 1}`);
  const planOverflow = flowFields(p6, font, 6, planNames, input.sectionXIIIPlan, 9);
  const physician = sig("sec13_physician");
  await sigInto(doc, p6, font, 6, "Signature of Attending Physician", physician, 10);
  if (physician) {
    fld(p6, font, 6, "Date", new Date(physician.signed_at).toLocaleDateString(), 9);
  }
  const sec13Client = sig("sec13_client");
  await sigInto(doc, p6, font, 6, "Signature of Client or Clients Representative", sec13Client, 10);
  if (sec13Client) {
    fld(p6, font, 6, "Date_2", new Date(sec13Client.signed_at).toLocaleDateString(), 9);
  }

  /* ---------------------------------------------------------------- page 7 */
  // Always included. Only the extension-of-benefits row is ours to fill; the
  // XIV. Provider Notification block below it is completed by DMS.
  const p7 = pages[6];
  const ext = input.extension;
  if (p7 && ext) {
    fld(p7, font, 7, "Additional ServiceTime Increments RequestedRow1", ext.additional_service_time_increments, 9);
    fld(p7, font, 7, "Begin Date of ServiceRow1", ext.begin_date_of_service, 9);
    fld(p7, font, 7, "End Date of ServiceRow1", ext.end_date_of_service, 9);
  }

  const nurse = sig("sec11_nurse");
  if (
    diagOverflow.length ||
    mentalOverflow ||
    narrOverflow ||
    altOverflow ||
    sec12Overflow ||
    planOverflow
  ) {
    addContinuation(doc, font, bold, input, {
      diagnoses: diagOverflow,
      mentalStatus: mentalOverflow,
      narrative: narrOverflow,
      alternateResources: altOverflow,
      sectionXII: sec12Overflow,
      sectionXIII: planOverflow,
    });
  }

  const finalSigner = nurse
    ? `${asciiSafe(nurse.signer_name)} on ${new Date(nurse.signed_at).toLocaleString()}`
    : "";
  await stampEveryPage(
    doc,
    mode,
    mode === "draft"
      ? `Draft - DMS-618 (8/23), version ${input.version}. Not for submission.`
      : `DMS-618 (8/23), version ${input.version}. Signed ${finalSigner}.`,
  );

  flatten(doc);
  return doc.save();
}

function addContinuation(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  input: Form618PdfInput,
  over: {
    diagnoses: { icd_code?: string; description?: string }[];
    mentalStatus: string;
    narrative: string;
    alternateResources: string;
    sectionXII: string;
    sectionXIII: string;
  },
) {
  const page = doc.addPage([612, 792]);
  let top = 70;
  page.drawText("DMS-618 (8/23) - Continuation Page", { x: 180, y: y(top), size: 11, font: bold });
  top = 96;
  page.drawText(asciiSafe(`Client's Name: ${input.clientName}`), { x: 76, y: y(top), size: 9.5, font });
  page.drawText(asciiSafe(`Medicaid ID #: ${input.medicaidId || ""}`), {
    x: 360,
    y: y(top),
    size: 9.5,
    font,
  });
  top = 112;
  page.drawText("Form: Personal Care Assessment and Service Plan, DMS-618 (8/23)", {
    x: 76,
    y: y(top),
    size: 9.5,
    font,
  });
  top = 142;

  const block = (title: string, lines: string[]) => {
    if (!lines.length) return;
    page.drawText(asciiSafe(title), { x: 76, y: y(top), size: 9.5, font: bold });
    top += 16;
    for (const ln of lines) {
      page.drawText(asciiSafe(ln), { x: 90, y: y(top), size: 9, font });
      top += 12;
    }
    top += 12;
  };

  block(
    "Continuation of Section V - Medical Diagnoses (see attached), page 2 of 7",
    over.diagnoses.map((dx, i) => `${i + 5}.  ${dx.icd_code ?? ""}   ${dx.description ?? ""}`),
  );
  block(
    "Continuation of Section VI - Mental Status comments (see attached), page 2 of 7",
    over.mentalStatus ? wrapText(font, over.mentalStatus, 9, 440) : [],
  );
  block(
    "Continuation of Section IX - Assessment Narrative (see attached), page 4 of 7",
    over.narrative ? wrapText(font, over.narrative, 9, 440) : [],
  );
  block(
    "Continuation of Section X - Alternate Resources (see attached), page 4 of 7",
    over.alternateResources ? wrapText(font, over.alternateResources, 9, 440) : [],
  );
  block(
    "Continuation of Section XII - Personal Care Service Plan (see attached), page 5 of 7",
    over.sectionXII ? wrapText(font, over.sectionXII, 9, 440) : [],
  );
  block(
    "Continuation of Section XIII - Service Plan (see attached), page 6 of 7",
    over.sectionXIII ? wrapText(font, over.sectionXIII, 9, 440) : [],
  );

  page.drawText("Assessing RN initials: ______________", { x: 76, y: y(700), size: 9.5, font });
  page.drawText("Date: ______________", { x: 330, y: y(700), size: 9.5, font });
}

export async function downloadForm618Pdf(input: Form618PdfInput, fileName: string) {
  downloadPdf(await buildForm618Pdf(input), fileName);
}

export async function printForm618Pdf(input: Form618PdfInput) {
  printPdf(await buildForm618Pdf(input));
}
