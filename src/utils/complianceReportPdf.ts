import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface CaregiverCredential {
  id: string;
  caregiver_id: string;
  credential_name: string;
  credential_type: string;
  credential_number: string | null;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  document_url: string | null;
  caregiver: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    status: string;
  };
}

interface ComplianceStats {
  totalCredentials: number;
  validCredentials: number;
  expiringCredentials: number;
  expiredCredentials: number;
  totalCaregivers: number;
  compliantCaregivers: number;
  nonCompliantCaregivers: number;
}

interface RequiredTraining {
  name: string;
  description: string;
  requiredForAll: boolean;
}

interface ReportData {
  credentials: CaregiverCredential[];
  stats: ComplianceStats;
  expiringDaysFilter: number;
  requiredTrainings: RequiredTraining[];
  getCredentialStatus: (expiryDate: string | null) => 'valid' | 'expiring' | 'expired';
  getDaysUntilExpiry: (expiryDate: string | null) => number | null;
}

// Color palette
const colors = {
  primary: [59, 130, 246] as [number, number, number], // Blue
  success: [34, 197, 94] as [number, number, number], // Green
  warning: [245, 158, 11] as [number, number, number], // Amber
  danger: [239, 68, 68] as [number, number, number], // Red
  muted: [107, 114, 128] as [number, number, number], // Gray
  dark: [31, 41, 55] as [number, number, number], // Dark gray
};

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 35, "F");
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 28);
  }
  
  // Reset text color
  doc.setTextColor(...colors.dark);
}

function addFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(
      `Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`,
      14,
      pageHeight - 10
    );
  }
}

function addStatsSection(doc: jsPDF, stats: ComplianceStats, yPos: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = (pageWidth - 42) / 4;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.dark);
  doc.text("Compliance Overview", 14, yPos);
  
  yPos += 10;
  
  const compliancePercentage = stats.totalCaregivers > 0 
    ? Math.round((stats.compliantCaregivers / stats.totalCaregivers) * 100)
    : 0;
  
  // Stats cards
  const statsData = [
    { label: "Compliance Rate", value: `${compliancePercentage}%`, color: compliancePercentage >= 90 ? colors.success : compliancePercentage >= 70 ? colors.warning : colors.danger },
    { label: "Expired", value: stats.expiredCredentials.toString(), color: colors.danger },
    { label: "Expiring Soon", value: stats.expiringCredentials.toString(), color: colors.warning },
    { label: "Valid", value: stats.validCredentials.toString(), color: colors.success },
  ];
  
  statsData.forEach((stat, index) => {
    const xPos = 14 + (cardWidth + 4) * index;
    
    // Card background
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(xPos, yPos, cardWidth, 30, 3, 3, "F");
    
    // Colored left border
    doc.setFillColor(...stat.color);
    doc.rect(xPos, yPos, 3, 30, "F");
    
    // Label
    doc.setFontSize(9);
    doc.setTextColor(...colors.muted);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label, xPos + 8, yPos + 10);
    
    // Value
    doc.setFontSize(18);
    doc.setTextColor(...stat.color);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, xPos + 8, yPos + 24);
  });
  
  return yPos + 40;
}

export function generateFullComplianceReport(data: ReportData): void {
  const doc = new jsPDF();
  const { credentials, stats, expiringDaysFilter, requiredTrainings, getCredentialStatus, getDaysUntilExpiry } = data;
  
  addHeader(doc, "Compliance Audit Report", `Generated on ${format(new Date(), "MMMM d, yyyy")}`);
  
  let yPos = 45;
  
  // Stats overview
  yPos = addStatsSection(doc, stats, yPos);
  
  // Summary text
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.dark);
  doc.text(
    `This report covers ${stats.totalCaregivers} active caregivers with ${stats.totalCredentials} total credentials.`,
    14,
    yPos
  );
  yPos += 10;
  
  // All Credentials Table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("All Credentials", 14, yPos);
  yPos += 5;
  
  const credentialRows = credentials.map((cred) => {
    const status = getCredentialStatus(cred.expiry_date);
    const days = getDaysUntilExpiry(cred.expiry_date);
    const statusText = status === 'expired' 
      ? `Expired ${days !== null ? Math.abs(days) + ' days ago' : ''}`
      : status === 'expiring'
      ? `Expiring in ${days} days`
      : 'Valid';
    
    return [
      `${cred.caregiver.first_name} ${cred.caregiver.last_name}`,
      cred.credential_name,
      cred.credential_type,
      cred.expiry_date ? format(new Date(cred.expiry_date), "MMM d, yyyy") : "N/A",
      statusText,
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [["Caregiver", "Credential", "Type", "Expiry Date", "Status"]],
    body: credentialRows,
    theme: "striped",
    headStyles: { 
      fillColor: colors.primary,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: { 
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 40 },
    },
    didParseCell: function (data) {
      if (data.column.index === 4 && data.section === 'body') {
        const text = data.cell.raw as string;
        if (text.includes('Expired')) {
          data.cell.styles.textColor = colors.danger;
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Expiring')) {
          data.cell.styles.textColor = colors.warning;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = colors.success;
        }
      }
    },
  });
  
  // Required Trainings section on new page
  doc.addPage();
  addHeader(doc, "Required Trainings", "Mandatory trainings for all active caregivers");
  
  yPos = 50;
  
  const trainingRows = requiredTrainings.map((training) => [
    training.name,
    training.description,
    training.requiredForAll ? "All Caregivers" : "Selected",
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [["Training Name", "Description", "Requirement"]],
    body: trainingRows,
    theme: "striped",
    headStyles: { 
      fillColor: colors.primary,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: { 
      fontSize: 9,
      cellPadding: 4,
    },
  });
  
  addFooter(doc);
  
  doc.save(`compliance-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function generateExpiredCredentialsReport(data: ReportData): void {
  const doc = new jsPDF();
  const { credentials, getCredentialStatus, getDaysUntilExpiry } = data;
  
  const expiredCredentials = credentials.filter(c => getCredentialStatus(c.expiry_date) === 'expired');
  
  addHeader(doc, "Expired Credentials Report", `${expiredCredentials.length} credentials require immediate attention`);
  
  let yPos = 50;
  
  if (expiredCredentials.length === 0) {
    doc.setFontSize(14);
    doc.setTextColor(...colors.success);
    doc.setFont("helvetica", "bold");
    doc.text("✓ No expired credentials found!", 14, yPos);
    doc.setFontSize(10);
    doc.setTextColor(...colors.muted);
    doc.setFont("helvetica", "normal");
    doc.text("All caregiver credentials are current and valid.", 14, yPos + 10);
  } else {
    const rows = expiredCredentials.map((cred) => {
      const days = getDaysUntilExpiry(cred.expiry_date);
      return [
        `${cred.caregiver.first_name} ${cred.caregiver.last_name}`,
        cred.caregiver.email || "N/A",
        cred.caregiver.phone || "N/A",
        cred.credential_name,
        cred.expiry_date ? format(new Date(cred.expiry_date), "MMM d, yyyy") : "N/A",
        days !== null ? `${Math.abs(days)} days ago` : "N/A",
      ];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [["Caregiver", "Email", "Phone", "Credential", "Expired On", "Days Overdue"]],
      body: rows,
      theme: "striped",
      headStyles: { 
        fillColor: colors.danger,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: { 
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        5: { textColor: colors.danger, fontStyle: 'bold' },
      },
    });
  }
  
  addFooter(doc);
  
  doc.save(`expired-credentials-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function generateExpiringCredentialsReport(data: ReportData): void {
  const doc = new jsPDF();
  const { credentials, expiringDaysFilter, getCredentialStatus, getDaysUntilExpiry } = data;
  
  const expiringCredentials = credentials.filter(c => getCredentialStatus(c.expiry_date) === 'expiring');
  
  addHeader(doc, "Expiring Credentials Report", `${expiringCredentials.length} credentials expiring within ${expiringDaysFilter} days`);
  
  let yPos = 50;
  
  if (expiringCredentials.length === 0) {
    doc.setFontSize(14);
    doc.setTextColor(...colors.success);
    doc.setFont("helvetica", "bold");
    doc.text("✓ No credentials expiring soon!", 14, yPos);
    doc.setFontSize(10);
    doc.setTextColor(...colors.muted);
    doc.setFont("helvetica", "normal");
    doc.text(`No credentials are expiring within the next ${expiringDaysFilter} days.`, 14, yPos + 10);
  } else {
    const rows = expiringCredentials.map((cred) => {
      const days = getDaysUntilExpiry(cred.expiry_date);
      return [
        `${cred.caregiver.first_name} ${cred.caregiver.last_name}`,
        cred.caregiver.email || "N/A",
        cred.caregiver.phone || "N/A",
        cred.credential_name,
        cred.expiry_date ? format(new Date(cred.expiry_date), "MMM d, yyyy") : "N/A",
        days !== null ? `${days} days` : "N/A",
      ];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [["Caregiver", "Email", "Phone", "Credential", "Expires On", "Days Left"]],
      body: rows,
      theme: "striped",
      headStyles: { 
        fillColor: colors.warning,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: { 
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        5: { textColor: colors.warning, fontStyle: 'bold' },
      },
    });
  }
  
  addFooter(doc);
  
  doc.save(`expiring-credentials-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function generateCaregiverComplianceReport(data: ReportData): void {
  const doc = new jsPDF();
  const { credentials, stats, getCredentialStatus } = data;
  
  addHeader(doc, "Caregiver Compliance Summary", `${stats.totalCaregivers} active caregivers analyzed`);
  
  let yPos = 50;
  
  // Group credentials by caregiver
  const caregiverMap: Record<string, { 
    name: string; 
    email: string; 
    phone: string;
    credentials: Array<{ name: string; status: string; expiry: string | null }>;
  }> = {};
  
  credentials.forEach((cred) => {
    if (!caregiverMap[cred.caregiver_id]) {
      caregiverMap[cred.caregiver_id] = {
        name: `${cred.caregiver.first_name} ${cred.caregiver.last_name}`,
        email: cred.caregiver.email || "N/A",
        phone: cred.caregiver.phone || "N/A",
        credentials: [],
      };
    }
    caregiverMap[cred.caregiver_id].credentials.push({
      name: cred.credential_name,
      status: getCredentialStatus(cred.expiry_date),
      expiry: cred.expiry_date,
    });
  });
  
  const rows = Object.values(caregiverMap).map((caregiver) => {
    const valid = caregiver.credentials.filter(c => c.status === 'valid').length;
    const expiring = caregiver.credentials.filter(c => c.status === 'expiring').length;
    const expired = caregiver.credentials.filter(c => c.status === 'expired').length;
    const total = caregiver.credentials.length;
    const complianceStatus = expired > 0 ? "Non-Compliant" : "Compliant";
    
    return [
      caregiver.name,
      caregiver.email,
      total.toString(),
      valid.toString(),
      expiring.toString(),
      expired.toString(),
      complianceStatus,
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [["Caregiver", "Email", "Total", "Valid", "Expiring", "Expired", "Status"]],
    body: rows,
    theme: "striped",
    headStyles: { 
      fillColor: colors.primary,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: { 
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center', textColor: colors.success },
      4: { halign: 'center', textColor: colors.warning },
      5: { halign: 'center', textColor: colors.danger },
    },
    didParseCell: function (data) {
      if (data.column.index === 6 && data.section === 'body') {
        const text = data.cell.raw as string;
        if (text === 'Non-Compliant') {
          data.cell.styles.textColor = colors.danger;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = colors.success;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });
  
  addFooter(doc);
  
  doc.save(`caregiver-compliance-summary-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
