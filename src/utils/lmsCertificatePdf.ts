import jsPDF from "jspdf";

export interface LmsCertificateData {
  caregiverName: string;
  courseTitle: string;
  completionDate: string;
  score?: number | null;
  agencyName?: string;
}

export async function generateLmsCertificate(data: LmsCertificateData): Promise<jsPDF> {
  const { caregiverName, courseTitle, completionDate, score, agencyName = "Home Care Headquarters" } = data;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(30, 80, 130);
  doc.setLineWidth(3);
  doc.rect(30, 30, w - 60, h - 60);
  doc.setLineWidth(1);
  doc.rect(38, 38, w - 76, h - 76);

  doc.setDrawColor(180, 160, 100);
  doc.setLineWidth(0.5);
  doc.rect(50, 50, w - 100, h - 100);

  let y = 110;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(agencyName.toUpperCase(), w / 2, y, { align: "center" });
  y += 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(30, 80, 130);
  doc.text("CERTIFICATE OF COMPLETION", w / 2, y, { align: "center" });
  y += 15;
  doc.setDrawColor(180, 160, 100);
  doc.setLineWidth(1.5);
  doc.line(w / 2 - 150, y, w / 2 + 150, y);
  y += 40;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text("This certifies that", w / 2, y, { align: "center" });
  y += 45;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(30, 30, 30);
  doc.text(caregiverName, w / 2, y, { align: "center" });
  y += 10;
  doc.setDrawColor(30, 80, 130);
  doc.setLineWidth(0.8);
  doc.line(w / 2 - 180, y, w / 2 + 180, y);
  y += 35;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("has successfully completed the training course", w / 2, y, { align: "center" });
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 80, 130);
  doc.text(courseTitle, w / 2, y, { align: "center" });
  y += 55;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  const leftCol = w / 2 - 150;
  const rightCol = w / 2 + 150;

  doc.text("Date of Completion", leftCol, y, { align: "center" });
  doc.line(leftCol - 80, y + 5, leftCol + 80, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(completionDate, leftCol, y + 23, { align: "center" });

  if (score != null) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text("Score", rightCol, y, { align: "center" });
    doc.line(rightCol - 80, y + 5, rightCol + 80, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(`${score}%`, rightCol, y + 23, { align: "center" });
  }

  return doc;
}

export async function generateLmsCertificateBlob(data: LmsCertificateData): Promise<Blob> {
  const doc = await generateLmsCertificate(data);
  return doc.output("blob");
}

export async function downloadLmsCertificate(data: LmsCertificateData) {
  const doc = await generateLmsCertificate(data);
  doc.save(`Certificate_${data.courseTitle.replace(/\s+/g, "_")}_${data.caregiverName.replace(/\s+/g, "_")}.pdf`);
}
