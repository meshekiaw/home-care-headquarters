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

const BLANK_URL = "/forms/nurse-visit-03-21.pdf";
const PRINTED_ROWS = 3;

export interface NurseVisitSignature {
  signature_slot: string;
  signer_type: string;
  signer_name: string;
  signature_data: string;
  signed_at: string;
}

export interface NurseVisitPdfInput {
  data: any;
  signatures: NurseVisitSignature[];
  status: string;
  version: number;
  clientName: string;
  medicaidId?: string;
  rnName?: string;
  exceptionLabel?: string | null;
}

const TICK = "X";

const SERVICE_BOXES: Record<string, [number, number]> = {
  PC: [146, 644],
  "AR Choice": [200, 644],
  VA: [294, 644],
  RS: [339, 645],
  "Private Insurance": [384, 644],
  "Private Pay": [488, 644],
};

const MOBILITY_BOXES: Record<string, [number, number]> = {
  walks_independently: [42, 588],
  walks_with_help: [42, 572],
  walks_with_device: [42, 557],
  transfers_independently: [312, 588],
  transfers_with_help: [312, 572],
  confined_to_chair_or_bed: [312, 557],
};

const DEVICE_BOXES: Record<string, [number, number]> = {
  walker: [112, 541],
  cane: [169, 541],
  wheelchair: [216, 541],
};

const RESPONSE_ROWS: Record<string, number> = {
  pleased_with_care: 498,
  follows_service_plan: 476,
  conduct_and_schedule: 454,
};

const PERFORMANCE_ROWS: Record<string, number> = {
  performs_tasks: 407,
  relates_well: 385,
  caring_and_sympathetic: 363,
};

const YNA_COLUMNS: Record<string, number> = { Yes: 483, No: 519, "N/A": 553 };

const SERVICE_PLAN_ROWS: Record<string, number> = {
  plan_adequate: 250,
  needs_changes: 234,
  needs_copy: 218,
};

const HOSP_ROWS = [310, 295, 280];
const HOSP_COLS = { admit: 44, admitTime: 125, hospital: 188, discharge: 441, dischargeTime: 512 };
const HOSP_WIDTHS = { admit: 75, admitTime: 58, hospital: 246, discharge: 65, dischargeTime: 48 };

const COMMENT_LINES = [
  { x: 43, y: 164, width: 522 },
  { x: 44, y: 141, width: 522 },
  { x: 43, y: 118, width: 522 },
];

function stamp(page: any, font: any, x: number, y: number) {
  page.drawText(TICK, { x, y, size: 9, font, color: rgb(0, 0, 0) });
}

export async function buildNurseVisitPdf(input: NurseVisitPdfInput): Promise<Uint8Array> {
  const { data, signatures, status } = input;
  const mode: FillMode = status === "draft" ? "draft" : "final";
  const doc = await loadBlank(BLANK_URL);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.getPages()[0];

  drawFitted(page, font, data?.client_name || input.clientName, 107, 702, 268, 10);
  drawFitted(page, font, data?.visit_date, 428, 701, 124, 10);
  drawFitted(page, font, data?.caregiver_name, 123, 677, 250, 10);

  if (data?.caregiver_present === "Yes") stamp(page, bold, 490, 674);
  if (data?.caregiver_present === "No") stamp(page, bold, 524, 674);

  for (const type of data?.service_types ?? []) {
    const box = SERVICE_BOXES[type];
    if (box) stamp(page, bold, box[0], box[1]);
  }
  for (const key of data?.mobility ?? []) {
    const box = MOBILITY_BOXES[key];
    if (box) stamp(page, bold, box[0], box[1]);
  }
  if ((data?.mobility ?? []).includes("walks_with_device")) {
    for (const key of data?.mobility_devices ?? []) {
      const box = DEVICE_BOXES[key];
      if (box) stamp(page, bold, box[0], box[1]);
    }
  }

  for (const [key, y] of Object.entries(RESPONSE_ROWS)) {
    const x = YNA_COLUMNS[data?.client_responses?.[key]];
    if (x) stamp(page, bold, x, y);
  }
  for (const [key, y] of Object.entries(PERFORMANCE_ROWS)) {
    const x = YNA_COLUMNS[data?.caregiver_performance?.[key]];
    if (x) stamp(page, bold, x, y);
  }
  for (const [key, y] of Object.entries(SERVICE_PLAN_ROWS)) {
    const answer = data?.service_plan?.[key];
    if (answer === "Yes") stamp(page, bold, 311, y);
    if (answer === "No") stamp(page, bold, 346, y);
  }

  const hospitalized = data?.hospitalized === "Yes";
  if (hospitalized) stamp(page, bold, 381, 343);
  if (data?.hospitalized === "No") stamp(page, bold, 416, 343);

  const stays: any[] = hospitalized ? (data?.hospitalizations ?? []) : [];
  stays.slice(0, PRINTED_ROWS).forEach((row, i) => {
    const y = HOSP_ROWS[i];
    drawFitted(page, font, row?.admit_date, HOSP_COLS.admit, y, HOSP_WIDTHS.admit, 8.5);
    drawFitted(page, font, row?.admit_time, HOSP_COLS.admitTime, y, HOSP_WIDTHS.admitTime, 8.5);
    drawFitted(page, font, row?.hospital, HOSP_COLS.hospital, y, HOSP_WIDTHS.hospital, 8.5);
    drawFitted(page, font, row?.discharge_date, HOSP_COLS.discharge, y, HOSP_WIDTHS.discharge, 8.5);
    drawFitted(
      page,
      font,
      row?.discharge_time,
      HOSP_COLS.dischargeTime,
      y,
      HOSP_WIDTHS.dischargeTime,
      8.5,
    );
  });
  const extraStays = stays.slice(PRINTED_ROWS);

  const commentText = [
    data?.comments ?? "",
    input.exceptionLabel ? `Client signature exception: ${input.exceptionLabel}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const { lines, overflow } = fitLines(
    font,
    commentText,
    9,
    COMMENT_LINES[0].width,
    COMMENT_LINES.length,
    extraStays.length > 0,
  );
  lines.forEach((line, i) => {
    const slot = COMMENT_LINES[i];
    drawFitted(page, font, line, slot.x, slot.y, slot.width, 9);
  });

  const clientSig = signatures.find((s) => s.signature_slot === "client");
  const rnSig = signatures.find((s) => s.signature_slot === "nurse");
  if (clientSig) {
    await stampSignature(doc, page, font, clientSig.signature_data, "", {
      x: 114,
      y: 78,
      width: 180,
      height: 18,
    });
  }
  if (rnSig) {
    await stampSignature(doc, page, font, rnSig.signature_data, "", {
      x: 375,
      y: 78,
      width: 185,
      height: 18,
    });
  }
  const caption = (sig?: NurseVisitSignature) =>
    sig ? `${asciiSafe(sig.signer_name)} (${sig.signer_type}) - ${new Date(sig.signed_at).toLocaleString()}` : "";
  if (clientSig) drawFitted(page, font, caption(clientSig), 114, 66, 190, 6.5);
  if (rnSig) drawFitted(page, font, caption(rnSig), 375, 66, 190, 6.5);

  if (extraStays.length || overflow) {
    addContinuation(doc, font, bold, input, extraStays, overflow);
  }

  await stampEveryPage(
    doc,
    mode,
    mode === "draft"
      ? `Draft - Nurse Visit form, version ${input.version}. Not for submission.`
      : `Nurse Visit form, version ${input.version}. Signed ${rnSig ? new Date(rnSig.signed_at).toLocaleString() : ""}${
          input.rnName ? ` by ${asciiSafe(input.rnName)}` : ""
        }.`,
  );

  flatten(doc);
  return doc.save();
}

function addContinuation(
  doc: PDFDocument,
  font: any,
  bold: any,
  input: NurseVisitPdfInput,
  extraStays: any[],
  overflow: string,
) {
  const page = doc.addPage([612, 792]);
  let y = 730;
  page.drawText("Nurse Visit Form (Revised 03/21) - Continuation Page", {
    x: 60,
    y,
    size: 12,
    font: bold,
  });
  y -= 18;
  page.drawText(
    asciiSafe(`Client: ${input.clientName}    Medicaid ID: ${input.medicaidId || "—"}`),
    { x: 60, y, size: 9.5, font },
  );
  y -= 26;

  if (extraStays.length) {
    page.drawText("Continuation of Hospitalizations - see attached", { x: 60, y, size: 10, font: bold });
    y -= 16;
    extraStays.forEach((row, i) => {
      const text = `${i + 4}. Admit ${row?.admit_date || "—"} ${row?.admit_time || ""} | ${
        row?.hospital || "—"
      } | Discharge ${row?.discharge_date || "—"} ${row?.discharge_time || ""}`;
      for (const line of wrapText(font, text, 9, 480)) {
        page.drawText(line, { x: 70, y, size: 9, font });
        y -= 13;
      }
    });
    y -= 12;
  }

  if (overflow) {
    page.drawText("Continuation of Comments / Further Instructions - see attached", {
      x: 60,
      y,
      size: 10,
      font: bold,
    });
    y -= 16;
    for (const line of wrapText(font, overflow, 9, 480)) {
      page.drawText(line, { x: 70, y, size: 9, font });
      y -= 13;
    }
    y -= 12;
  }

  page.drawText("Assessing RN initials: ______________     Date: ______________", {
    x: 60,
    y: Math.max(y, 90),
    size: 9.5,
    font,
  });
}

export async function downloadNurseVisitPdf(input: NurseVisitPdfInput, fileName: string) {
  downloadPdf(await buildNurseVisitPdf(input), fileName);
}

export async function printNurseVisitPdf(input: NurseVisitPdfInput) {
  printPdf(await buildNurseVisitPdf(input));
}
