import { PDFDocument, PDFFont, PDFName, PDFPage, StandardFonts, rgb, degrees } from "pdf-lib";

export type FillMode = "draft" | "final";

export async function loadBlank(url: string): Promise<PDFDocument> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Could not load the blank form (${res.status})`);
  const bytes = await res.arrayBuffer();
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
}

export function asciiSafe(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

/** Remove every interactive field so the output renders identically everywhere. */
export function flatten(doc: PDFDocument) {
  for (const page of doc.getPages()) {
    try {
      page.node.delete(PDFName.of("Annots"));
    } catch {
      /* no annotations on this page */
    }
  }
  try {
    doc.catalog.delete(PDFName.of("AcroForm"));
  } catch {
    /* no AcroForm */
  }
}

export function textWidth(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(asciiSafe(text), size);
}

/** Draw a value, shrinking it until it fits the given width. */
export function drawFitted(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size = 9,
) {
  const value = asciiSafe(text);
  if (!value) return;
  let s = size;
  while (s > 6 && textWidth(font, value, s) > maxWidth) s -= 0.25;
  page.drawText(value, { x, y, size: s, font, color: rgb(0, 0, 0) });
}

export function wrapText(font: PDFFont, text: string, size: number, width: number): string[] {
  const words = asciiSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (textWidth(font, trial, size) > width && line) {
      lines.push(line);
      line = w;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const CONT_NOTE = " (continued on attached page)";

/**
 * Fit `text` into `lineCount` printed lines. When it overflows, the last line
 * that fits ends with "(continued on attached page)" and the rest is returned.
 */
export function fitLines(
  font: PDFFont,
  text: string,
  size: number,
  width: number,
  lineCount: number,
  forceNote = false,
): { lines: string[]; overflow: string } {
  const all = wrapText(font, text, size, width);
  const lines = all.slice(0, lineCount);
  let overflow = all.slice(lineCount);
  if ((overflow.length || forceNote) && lines.length) {
    const room = width - textWidth(font, CONT_NOTE, size);
    const words = lines[lines.length - 1].split(" ");
    const moved: string[] = [];
    while (words.length && textWidth(font, words.join(" "), size) > room) {
      moved.unshift(words.pop() as string);
    }
    lines[lines.length - 1] = `${words.join(" ")}${CONT_NOTE}`.trim();
    if (moved.length) overflow = [moved.join(" "), ...overflow];
  }
  return { lines, overflow: overflow.join(" ") };
}

export async function stampSignature(
  doc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  dataUrl: string,
  caption: string,
  box: { x: number; y: number; width: number; height: number },
) {
  if (dataUrl?.startsWith("data:image/png")) {
    const png = await doc.embedPng(dataUrl);
    const scale = Math.min(box.width / png.width, box.height / png.height, 1);
    page.drawImage(png, {
      x: box.x,
      y: box.y,
      width: png.width * scale,
      height: png.height * scale,
    });
  }
  if (caption) {
    page.drawText(asciiSafe(caption), {
      x: box.x,
      y: box.y + box.height + 1.5,
      size: 6,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
}

export async function stampEveryPage(doc: PDFDocument, mode: FillMode, footer: string) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    if (mode === "draft") {
      page.drawText("DRAFT - NOT FOR SUBMISSION", {
        x: width / 2 - 250,
        y: height / 2 - 40,
        size: 42,
        font: bold,
        color: rgb(1, 0.72, 0.72),
        rotate: degrees(38),
      });
    }
    page.drawText(asciiSafe(footer), {
      x: 72,
      y: 14,
      size: 7.5,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function printPdf(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, "_blank");
    }
  };
  document.body.appendChild(frame);
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 60000);
}
