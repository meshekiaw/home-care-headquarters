// In-service (annual training) period math, driven by each caregiver's hire date
// and the agency's in-service program start date.

export const FULL_IN_SERVICE_HOURS = 12;
/** Kept for compatibility with older imports. */
export const REQUIRED_IN_SERVICE_HOURS = FULL_IN_SERVICE_HOURS;
export const TOTAL_IN_SERVICE_SESSIONS = 12;
export const DUE_SOON_DAYS = 60;

export type InServiceStatus =
  | "past_due"
  | "due_soon"
  | "on_track"
  | "complete"
  | "before_program"
  | "no_program_start"
  | "no_hire_date";

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

/** Whole months from `from` to `to`, rounded down (never negative). */
export function wholeMonthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Required hours for a training year running start..end, given the program start date.
 * - Year ended before the program started: not graded (0 required).
 * - Year in progress when the program started: prorated by whole months remaining.
 * - Year starting on/after the program start: the full 12 hours.
 */
export function requiredHoursForPeriod(
  periodStart: Date,
  periodEnd: Date,
  programStart: Date | null
): number {
  if (!programStart) return FULL_IN_SERVICE_HOURS;
  if (periodEnd < programStart) return 0;
  if (periodStart >= programStart) return FULL_IN_SERVICE_HOURS;
  const months = wholeMonthsBetween(programStart, periodEnd);
  return Math.min(FULL_IN_SERVICE_HOURS, Math.max(0, months));
}

export interface StatusInput {
  period: InServicePeriod | null;
  programStart: Date | null;
  hoursThisPeriod: number;
  requiredThisPeriod: number;
  hoursPreviousPeriod: number;
  requiredPreviousPeriod: number;
  previousGraded: boolean;
}

export function computeInServiceStatus(input: StatusInput): InServiceStatus {
  const {
    period,
    programStart,
    hoursThisPeriod,
    requiredThisPeriod,
    hoursPreviousPeriod,
    requiredPreviousPeriod,
    previousGraded,
  } = input;

  if (!period) return "no_hire_date";
  if (!programStart) return "no_program_start";
  if (period.end < programStart) return "before_program";
  // A closed, graded period that ended short is past due.
  if (previousGraded && requiredPreviousPeriod > 0 && hoursPreviousPeriod < requiredPreviousPeriod) {
    return "past_due";
  }
  if (hoursThisPeriod >= requiredThisPeriod) return "complete";
  if (period.daysRemaining <= DUE_SOON_DAYS) return "due_soon";
  return "on_track";
}

export const IN_SERVICE_STATUS_LABEL: Record<InServiceStatus, string> = {
  past_due: "Past due",
  due_soon: "Due soon",
  on_track: "On track",
  complete: "Complete",
  before_program: "Before program",
  no_program_start: "Program start date not set",
  no_hire_date: "Hire date missing",
};

/** Exact colours requested by the agency for the in-service status column. */
export const IN_SERVICE_STATUS_COLOR: Record<InServiceStatus, string | undefined> = {
  past_due: "#DC2626",
  due_soon: "#D97706",
  on_track: undefined,
  complete: "#16A34A",
  before_program: "#6B7280",
  no_program_start: "#6B7280",
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
  "before_program",
  "no_program_start",
];

export function formatPeriodDate(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
