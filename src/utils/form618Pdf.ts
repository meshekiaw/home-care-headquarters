import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  asciiSafe,
  downloadPdf,
  drawFitted,
  fitLines,
  flatten,
  loadBlank,
  printPdf,
  stampEveryPage,
  stampSignature,
  wrapText,
  type FillMode,
} from "./pdfFillShared";

const BLANK_URL = "/forms/dms-618-8-23.pdf";

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

export interface Form618PdfInput {
  clientName: string;
  medicaidId?: string;
  dateOfBirth?: string;
  status: string;
  version: number;
  assessmentDate?: string;
  rnName?: string;
  notes?: string;
  sectionXII?: {
    tasks: Record<string, { minutes?: string; days_per_week?: string }>;
    notes?: string;
  };
  totalMinutes?: number | string;
  defaults?: Form618AgencyDefaults | null;
  /** Section XIV extension of benefits request (page 7). Left blank when not requested. */
  extension?: {
    additional_service_time_increments?: string;
    begin_date_of_service?: string;
    end_date_of_service?: string;
  } | null;
  signatures: Form618Signature[];
}

const SECTION_XII_ROWS: { task: string; y: number }[] = [
  { task: "Eating", y: 218 },
  { task: "Bathing", y: 206.5 },
  { task: "Grooming", y: 195 },
  { task: "Tolieting", y: 183.5 },
  { task: "Dressing", y: 172 },
  { task: "Transfer/Mobility", y: 160.5 },
  { task: "Housekeeping", y: 149 },
  { task: "Laundry", y: 137.5 },
];

function headerPositions() {
  return [
    { page: 2, nameX: 152, nameY: 714, nameW: 159, idX: 406, idY: 714, idW: 122 },
    { page: 3, nameX: 152, nameY: 714, nameW: 139, idX: 391, idY: 714, idW: 142 },
    { page: 4, nameX: 152, nameY: 714, nameW: 159, idX: 405, idY: 714, idW: 125 },
    { page: 5, nameX: 152, nameY: 714, nameW: 159, idX: 406, idY: 714, idW: 122 },
    { page: 6, nameX: 152, nameY: 714, nameW: 159, idX: 406, idY: 714, idW: 122 },
    { page: 7, nameX: 152, nameY: 714, nameW: 159, idX: 406, idY: 714, idW: 122 },
  ];
}

export async function buildForm618Pdf(input: Form618PdfInput): Promise<Uint8Array> {
  const mode: FillMode = input.status === "draft" ? "draft" : "final";
  const doc = await loadBlank(BLANK_URL);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const d = input.defaults;
  const mid = input.medicaidId || "";

  // Repeating header: client name and Medicaid ID on pages 2-6 exactly where the printed form has them.
  for (const h of headerPositions()) {
    const page = pages[h.page - 1];
    if (!page) continue;
    drawFitted(page, font, input.clientName, h.nameX, h.nameY, h.nameW, 10);
    drawFitted(page, font, mid, h.idX, h.idY, h.idW, 10);
  }

  // Page 1 - client identification and agency information from Settings.
  const p1 = pages[0];
  drawFitted(p1, font, mid, 126, 668, 173, 10);
  drawFitted(p1, font, input.clientName, 76, 632, 302, 10);
  drawFitted(p1, font, input.dateOfBirth, 386, 632, 150, 10);
  if (d) {
    drawFitted(p1, font, d.provider_name, 216, 402, 318, 9);
    drawFitted(p1, font, d.provider_id_number, 185, 377, 46, 8.5);
    drawFitted(p1, font, d.mailing_address, 372, 377, 164, 8);
    drawFitted(p1, font, d.projected_end_date_of_service, 299, 176.5, 232, 9);
    drawFitted(p1, font, d.attending_physician, 300, 148.5, 232, 9);
    drawFitted(p1, font, d.attending_physician_provider_id, 356, 131.5, 176, 9);
    drawFitted(p1, font, d.referral_source, 298, 101, 234, 9);
  }
  drawFitted(p1, font, input.assessmentDate, 191, 164, 108, 9);
  drawFitted(p1, font, input.rnName, 378, 164, 152, 9);

  // Page 2 - Section IV signatures.
  const p2 = pages[1];
  const sig = (slot: string) => input.signatures.find((s) => s.signature_slot === slot);
  const caption = (s?: Form618Signature) =>
    s ? `${asciiSafe(s.signer_name)} (${s.signer_type}) - ${new Date(s.signed_at).toLocaleString()}` : "";

  const sec4Client = sig("sec4_client");
  if (sec4Client) {
    await stampSignature(doc, p2, font, sec4Client.signature_data, "", {
      x: 132,
      y: 612,
      width: 224,
      height: 16,
    });
    drawFitted(p2, font, caption(sec4Client), 132, 601, 80, 5.5);
    drawFitted(p2, font, new Date(sec4Client.signed_at).toLocaleDateString(), 399, 613, 128, 9);
  }
  const w1 = sig("sec4_witness_1");
  if (w1) {
    await stampSignature(doc, p2, font, w1.signature_data, "", {
      x: 75,
      y: 580,
      width: 155,
      height: 16,
    });
    drawFitted(p2, font, caption(w1), 75, 571, 84, 5.5);
  }
  const w2 = sig("sec4_witness_2");
  if (w2) {
    await stampSignature(doc, p2, font, w2.signature_data, "", {
      x: 377,
      y: 580,
      width: 152,
      height: 16,
    });
    drawFitted(p2, font, caption(w2), 377, 571, 190, 5.5);
  }

  // Page 4 - assessment narrative (Section IX) from the nurse's notes.
  const p4 = pages[3];
  const narrLines = 30;
  const narrTop = 663;
  const narr = fitLines(font, input.notes ?? "", 9, 462, narrLines);
  narr.lines.forEach((line, i) => {
    drawFitted(p4, font, line, 75, narrTop - i * 11.55, 462, 9);
  });

  // Page 5 - Section XI certification / comments and the Section XII task table.
  const p5 = pages[4];
  if (d) {
    const cert = fitLines(font, d.section_xi_certification, 9, 452, 3);
    cert.lines.forEach((line, i) => drawFitted(p5, font, line, 79, 645 - i * 15.5, 452, 9));
    drawFitted(p5, font, d.section_xi_comments, 79, 369, 448, 9);
  }

  p5.drawText("Tasks:", { x: 76, y: 230, size: 8.5, font: bold, color: rgb(0, 0, 0) });
  p5.drawText("Minutes:", { x: 200, y: 230, size: 8.5, font: bold, color: rgb(0, 0, 0) });
  p5.drawText("Days/wk:", { x: 262, y: 230, size: 8.5, font: bold, color: rgb(0, 0, 0) });
  for (const row of SECTION_XII_ROWS) {
    p5.drawText(row.task, { x: 76, y: row.y, size: 8.5, font, color: rgb(0, 0, 0) });
    const entry = input.sectionXII?.tasks?.[row.task];
    drawFitted(p5, font, entry?.minutes, 203, row.y, 50, 8.5);
    drawFitted(p5, font, entry?.days_per_week, 265, row.y, 50, 8.5);
  }
  p5.drawText("Total Minutes:", { x: 350, y: 137.5, size: 8.5, font: bold, color: rgb(0, 0, 0) });
  drawFitted(p5, font, String(input.totalMinutes ?? ""), 425, 137.5, 60, 8.5);

  const sec12Notes = fitLines(font, input.sectionXII?.notes ?? "", 9, 452, 4);
  sec12Notes.lines.forEach((line, i) => drawFitted(p5, font, line, 79, 126 - i * 11.5, 452, 9));

  const nurse = sig("sec11_nurse");
  if (nurse) {
    await stampSignature(doc, p5, font, nurse.signature_data, "", {
      x: 296,
      y: 321,
      width: 226,
      height: 16,
    });
    drawFitted(p5, font, caption(nurse), 296, 312, 148, 5.5);
  }

  // Page 6 - Section XIII signatures.
  const p6 = pages[5];
  const physician = sig("sec13_physician");
  if (physician) {
    await stampSignature(doc, p6, font, physician.signature_data, "", {
      x: 93,
      y: 311,
      width: 258,
      height: 16,
    });
    drawFitted(p6, font, caption(physician), 420, 302, 110, 5.5);
    drawFitted(p6, font, new Date(physician.signed_at).toLocaleDateString(), 395, 312, 118, 9);
  }
  const sec13Client = sig("sec13_client");
  if (sec13Client) {
    await stampSignature(doc, p6, font, sec13Client.signature_data, "", {
      x: 93,
      y: 204,
      width: 262,
      height: 16,
    });
    drawFitted(p6, font, caption(sec13Client), 420, 195, 110, 5.5);
    drawFitted(p6, font, new Date(sec13Client.signed_at).toLocaleDateString(), 401, 205, 112, 9);
  }

  // Page 7 stays in the output on every form; its extension fields are only
  // filled when an extension of benefits is being requested. The XIV. Provider
  // Notification block below them belongs to DMS and is always left blank.
  const p7 = pages[6];
  const ext = input.extension;
  if (p7 && ext) {
    drawFitted(p7, font, ext.additional_service_time_increments, 100, 515, 145, 9);
    drawFitted(p7, font, ext.begin_date_of_service, 257, 515, 150, 9);
    drawFitted(p7, font, ext.end_date_of_service, 418, 515, 115, 9);
  }

  if (narr.overflow || sec12Notes.overflow) {
    addContinuation(doc, font, bold, input, narr.overflow, sec12Notes.overflow);
  }

  const finalSigner = nurse ? `${asciiSafe(nurse.signer_name)} on ${new Date(nurse.signed_at).toLocaleString()}` : "";
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
  font: any,
  bold: any,
  input: Form618PdfInput,
  narrOverflow: string,
  sec12Overflow: string,
) {
  const page = doc.addPage([612, 792]);
  let y = 730;
  page.drawText("DMS-618 (8/23) - Continuation Page", { x: 60, y, size: 12, font: bold });
  y -= 18;
  page.drawText(
    asciiSafe(`Client: ${input.clientName}    Medicaid ID: ${input.medicaidId || "—"}`),
    { x: 60, y, size: 9.5, font },
  );
  y -= 26;

  const block = (title: string, body: string) => {
    if (!body) return;
    page.drawText(title, { x: 60, y, size: 10, font: bold });
    y -= 16;
    for (const line of wrapText(font, body, 9, 480)) {
      page.drawText(line, { x: 70, y, size: 9, font });
      y -= 13;
    }
    y -= 12;
  };

  block("Continuation of Section IX - Assessment Narrative - see attached", narrOverflow);
  block("Continuation of Section XII - Detailed information - see attached", sec12Overflow);

  page.drawText("Assessing RN initials: ______________     Date: ______________", {
    x: 60,
    y: Math.max(y, 90),
    size: 9.5,
    font,
  });
}

export async function downloadForm618Pdf(input: Form618PdfInput, fileName: string) {
  downloadPdf(await buildForm618Pdf(input), fileName);
}

export async function printForm618Pdf(input: Form618PdfInput) {
  printPdf(await buildForm618Pdf(input));
}
