import jsPDF from "jspdf";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameMonth } from "date-fns";

interface PdfOptions {
  currentMonth: Date;
  isARChoices: boolean;
  personalCareHours: number;
  attendantCareHours: number;
  standardHours: number;
  totalHours: number;
  weekdayCount: number;
  clientName?: string;
  caregiverName?: string;
  dailySchedule: Map<string, { pc: number; ac: number }>;
}

export function generateMonthlyCalendarPdf(options: PdfOptions) {
  const {
    currentMonth,
    isARChoices,
    personalCareHours,
    attendantCareHours,
    standardHours,
    totalHours,
    weekdayCount,
    clientName,
    caregiverName,
    dailySchedule,
  } = options;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ── Header ──
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${format(currentMonth, "MMMM yyyy")} Schedule`, margin, 15);

  if (isARChoices) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("ARChoices", margin + doc.getTextWidth(`${format(currentMonth, "MMMM yyyy")} Schedule`) + 4, 15);
    doc.setTextColor(0, 0, 0);
  }

  // Sub-header info
  let yPos = 22;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const infoParts: string[] = [];
  if (clientName) infoParts.push(`Client: ${clientName}`);
  if (caregiverName) infoParts.push(`Caregiver: ${caregiverName}`);
  if (isARChoices) {
    infoParts.push(`PC: ${personalCareHours} hrs`);
    infoParts.push(`AC: ${attendantCareHours} hrs`);
    infoParts.push(`Total: ${totalHours} hrs`);
  } else {
    infoParts.push(`Total: ${standardHours} hrs`);
  }
  infoParts.push(`Weekdays: ${weekdayCount}`);

  doc.text(infoParts.join("  |  "), margin, yPos);
  yPos += 6;

  // ── Calendar Grid ──
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const numWeeks = Math.ceil(allDays.length / 7);

  const gridLeft = margin;
  const gridTop = yPos;
  const colW = (pageW - 2 * margin) / 7;
  const headerH = 7;
  const availableH = pageH - gridTop - margin - 16; // leave room for footer
  const rowH = Math.min(availableH / (numWeeks + 1), 28); // +1 for header row, cap at 28mm

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Draw header row
  doc.setFillColor(240, 240, 245);
  doc.rect(gridLeft, gridTop, colW * 7, headerH, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  dayLabels.forEach((label, i) => {
    const x = gridLeft + i * colW + colW / 2;
    doc.text(label, x, gridTop + 5, { align: "center" });
  });

  // Draw day cells
  doc.setTextColor(0, 0, 0);
  for (let week = 0; week < numWeeks; week++) {
    for (let dow = 0; dow < 7; dow++) {
      const dayIdx = week * 7 + dow;
      if (dayIdx >= allDays.length) continue;
      const day = allDays[dayIdx];
      const x = gridLeft + dow * colW;
      const y = gridTop + headerH + week * rowH;
      const inMonth = isSameMonth(day, currentMonth);
      const weekend = isWeekend(day);

      // Cell background
      if (!inMonth) {
        doc.setFillColor(248, 248, 248);
      } else if (weekend) {
        doc.setFillColor(245, 245, 248);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(x, y, colW, rowH, "F");

      // Cell border
      doc.setDrawColor(210, 210, 215);
      doc.setLineWidth(0.3);
      doc.rect(x, y, colW, rowH, "S");

      // Day number
      doc.setFontSize(9);
      doc.setFont("helvetica", inMonth ? "bold" : "normal");
      doc.setTextColor(inMonth ? (weekend ? 150 : 40) : 190, inMonth ? (weekend ? 150 : 40) : 190, inMonth ? (weekend ? 150 : 40) : 190);
      doc.text(format(day, "d"), x + 2, y + 5);

      if (!inMonth || weekend) {
        if (weekend && inMonth) {
          doc.setFontSize(6);
          doc.setTextColor(180, 180, 180);
          doc.text("Off", x + 2, y + 10);
        }
        continue;
      }

      // Schedule data
      const dayKey = format(day, "yyyy-MM-dd");
      const schedule = dailySchedule.get(dayKey);
      if (!schedule) continue;
      const { pc, ac } = schedule;

      if (isARChoices) {
        let textY = y + 11;
        if (pc > 0) {
          // PC badge
          doc.setFillColor(255, 228, 230);
          doc.roundedRect(x + 2, textY - 3, colW - 4, 5.5, 1, 1, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(190, 40, 60);
          doc.text(`PC: ${pc} hrs`, x + 4, textY + 0.5);
          textY += 7;
        }
        if (ac > 0) {
          // AC badge
          doc.setFillColor(219, 234, 254);
          doc.roundedRect(x + 2, textY - 3, colW - 4, 5.5, 1, 1, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 64, 175);
          doc.text(`AC: ${ac} hrs`, x + 4, textY + 0.5);
          textY += 7;
        }
        // Total
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(`${pc + ac} hrs total`, x + 2, textY + 0.5);
      } else {
        // Standard badge
        doc.setFillColor(230, 240, 255);
        doc.roundedRect(x + 2, y + 8, colW - 4, 5.5, 1, 1, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 80, 180);
        doc.text(`${pc} hrs`, x + 4, y + 12);
      }
    }
  }

  // ── Footer Summary ──
  const footerY = gridTop + headerH + numWeeks * rowH + 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  if (isARChoices) {
    const acQ = Math.round(attendantCareHours * 4);
    const maxQ = 32;
    const acDays = acQ > 0 ? Math.min(Math.max(1, Math.ceil(acQ / maxQ)), weekdayCount) : 0;
    const pcDays = weekdayCount - acDays;

    doc.setTextColor(190, 40, 60);
    doc.setFont("helvetica", "bold");
    doc.text("Personal Care:", margin, footerY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`${personalCareHours} hrs across first ${pcDays} weekdays (used first)`, margin + 26, footerY);

    if (acDays > 0) {
      doc.setTextColor(30, 64, 175);
      doc.setFont("helvetica", "bold");
      doc.text("Attendant Care:", margin, footerY + 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`${attendantCareHours} hrs across last ${acDays} weekday${acDays > 1 ? "s" : ""} (used last)`, margin + 28, footerY + 4);
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`Combined Total: ${totalHours} hrs/month`, margin, footerY + 9);
  } else {
    doc.text(`Total: ${standardHours} hours distributed across ${weekdayCount} weekdays.`, margin, footerY);
  }

  // ── Legend (ARChoices) ──
  if (isARChoices) {
    const legendY = footerY - 1;
    const legendX = pageW - margin - 80;

    doc.setFillColor(255, 228, 230);
    doc.roundedRect(legendX, legendY - 2, 8, 4, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text("Personal Care (used first)", legendX + 10, legendY + 1);

    doc.setFillColor(219, 234, 254);
    doc.roundedRect(legendX, legendY + 4, 8, 4, 1, 1, "F");
    doc.text("Attendant Care (used last)", legendX + 10, legendY + 7);
  }

  // Save
  const clientPart = clientName ? `_${clientName.replace(/\s+/g, "_")}` : "";
  const monthPart = format(currentMonth, "yyyy-MM");
  doc.save(`Monthly_Calendar${clientPart}_${monthPart}.pdf`);
}
