import jsPDF from "jspdf";

interface CertificateData {
  caregiverName: string;
  completionDate: string;
  agencyName?: string;
  totalSections: number;
  signatureData?: string | null;
}

export async function generateOrientationCertificate(data: CertificateData): Promise<jsPDF> {
  const {
    caregiverName,
    completionDate,
    agencyName = "Home Care Agency",
    totalSections,
    signatureData,
  } = data;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");

  // Decorative border (double line)
  doc.setDrawColor(30, 80, 130);
  doc.setLineWidth(3);
  doc.rect(30, 30, w - 60, h - 60);
  doc.setLineWidth(1);
  doc.rect(38, 38, w - 76, h - 76);

  // Corner accents
  const accentSize = 30;
  doc.setFillColor(30, 80, 130);
  const corners = [
    [34, 34],
    [w - 34 - accentSize, 34],
    [34, h - 34 - accentSize],
    [w - 34 - accentSize, h - 34 - accentSize],
  ];
  corners.forEach(([x, y]) => {
    doc.rect(x, y, accentSize, accentSize, "F");
  });

  // Inner decorative line
  doc.setDrawColor(180, 160, 100);
  doc.setLineWidth(0.5);
  doc.rect(50, 50, w - 100, h - 100);

  let yPos = 100;

  // Agency name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(agencyName.toUpperCase(), w / 2, yPos, { align: "center" });
  yPos += 50;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.setTextColor(30, 80, 130);
  doc.text("CERTIFICATE OF COMPLETION", w / 2, yPos, { align: "center" });
  yPos += 15;

  // Decorative line under title
  doc.setDrawColor(180, 160, 100);
  doc.setLineWidth(1.5);
  doc.line(w / 2 - 150, yPos, w / 2 + 150, yPos);
  yPos += 40;

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text("This certifies that", w / 2, yPos, { align: "center" });
  yPos += 45;

  // Caregiver name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(30, 30, 30);
  doc.text(caregiverName, w / 2, yPos, { align: "center" });
  yPos += 10;

  // Line under name
  doc.setDrawColor(30, 80, 130);
  doc.setLineWidth(0.8);
  doc.line(w / 2 - 180, yPos, w / 2 + 180, yPos);
  yPos += 35;

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `has successfully completed all ${totalSections} sections of the`,
    w / 2,
    yPos,
    { align: "center" }
  );
  yPos += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 80, 130);
  doc.text("New Hire Orientation & Employee Handbook Training", w / 2, yPos, { align: "center" });
  yPos += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("including all required quizzes and digital acknowledgment.", w / 2, yPos, { align: "center" });
  yPos += 55;

  // Date and Signature side by side
  const leftCol = w / 2 - 160;
  const rightCol = w / 2 + 160;

  // Date
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text("Date of Completion", leftCol, yPos, { align: "center" });
  yPos += 5;
  doc.setDrawColor(30, 80, 130);
  doc.setLineWidth(0.5);
  doc.line(leftCol - 80, yPos, leftCol + 80, yPos);
  yPos += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(completionDate, leftCol, yPos, { align: "center" });

  // Signature
  const sigLabelY = yPos - 23;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text("Employee Signature", rightCol, sigLabelY, { align: "center" });
  doc.setDrawColor(30, 80, 130);
  doc.setLineWidth(0.5);
  doc.line(rightCol - 80, sigLabelY + 5, rightCol + 80, sigLabelY + 5);

  if (signatureData) {
    try {
      doc.addImage(signatureData, "PNG", rightCol - 70, sigLabelY + 8, 140, 40);
    } catch {
      // If signature image fails, skip
    }
  }

  return doc;
}

export function downloadOrientationCertificate(data: CertificateData) {
  const doc = generateOrientationCertificate(data);
  doc.then((d) =>
    d.save(`Orientation_Certificate_${data.caregiverName.replace(/\s+/g, "_")}.pdf`)
  );
}
