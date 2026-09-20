// In-service (annual training) period math, driven by each caregiver's hire date
// rather than the calendar year.

export const REQUIRED_IN_SERVICE_HOURS = 12;
export const TOTAL_IN_SERVICE_SESSIONS = 12;
export const DUE_SOON_DAYS = 60;

export type InServiceStatus = "past_due" | "due_soon" | "on_track" | "complete" | "no_hire_date";

export interface InServicePeriod {
  /** First day of the current period (most recent hire-date anniversary). */
  start: Date;
  /** Last day of the current period (day before the next anniversary). */
  end: Date;
  /** First day of the period immediately before the current one, if any. */
  previousStart: Date | null;
  previousEnd: Date | null;
  daysRemaining: number;
}

export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function addYears(d: Date, years: number): Date {
  return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function computeInServicePeriod(
  hireDate: string | null | undefined,
  today: Date = startOfToday()
): InServicePeriod | null {
  if (!hireDate) return null;
  const hire = parseDateOnly(hireDate.slice(0, 10));
  if (Number.isNaN(hire.getTime())) return null;

  let start = new Date(today.getFullYear(), hire.getMonth(), hire.getDate());
  if (start > today) start = addYears(start, -1);
  if (start < hire) start = hire;

  const end = addDays(addYears(start, 1), -1);
  const previousStart = start > hire ? addYears(start, -1) : null;
  const previousEnd = previousStart ? addDays(start, -1) : null;

  const daysRemaining = Math.round((end.getTime() - today.getTime()) / 86400000);

  return { start, end, previousStart, previousEnd, daysRemaining };
}

export function isWithin(date: string, start: Date, end: Date): boolean {
  const d = parseDateOnly(date.slice(0, 10));
  return d >= start && d <= end;
}

export function computeInServiceStatus(
  period: InServicePeriod | null,
  hoursThisPeriod: number,
  hoursPreviousPeriod: number
): InServiceStatus {
  if (!period) return "no_hire_date";
  if (hoursThisPeriod >= REQUIRED_IN_SERVICE_HOURS) return "complete";
  // A closed period that ended with fewer than 12 hours is past due.
  if (period.previousStart && hoursPreviousPeriod < REQUIRED_IN_SERVICE_HOURS) return "past_due";
  if (period.daysRemaining <= DUE_SOON_DAYS) return "due_soon";
  return "on_track";
}

export const IN_SERVICE_STATUS_LABEL: Record<InServiceStatus, string> = {
  past_due: "Past due",
  due_soon: "Due soon",
  on_track: "On track",
  complete: "Complete",
  no_hire_date: "Hire date missing",
};

/** Exact colours requested by the agency for the in-service status column. */
export const IN_SERVICE_STATUS_COLOR: Record<InServiceStatus, string | undefined> = {
  past_due: "#DC2626",
  due_soon: "#D97706",
  on_track: undefined,
  complete: "#16A34A",
  no_hire_date: "#DC2626",
};

export function inServiceStatusStyle(status: InServiceStatus): React.CSSProperties {
  const color = IN_SERVICE_STATUS_COLOR[status];
  return color
    ? { color, fontWeight: status === "past_due" || status === "no_hire_date" ? 700 : 500 }
    : {};
}

export const IN_SERVICE_STATUS_ORDER: InServiceStatus[] = [
  "past_due",
  "no_hire_date",
  "due_soon",
  "on_track",
  "complete",
];

export function formatPeriodDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
