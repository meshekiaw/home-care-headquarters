import type { Json } from "@/integrations/supabase/types";

export const CLIENT_PAYERS = ["Medicaid", "ARChoices", "PASSE", "VA", "Private pay", "Long-term care insurance", "Other"] as const;
export const CLIENT_STATUSES = [
  { value: "not_set", label: "Not set" },
  { value: "new_client", label: "New client" },
  { value: "current_staffed", label: "Current – staffed" },
  { value: "current_needs_staffing", label: "Current – needs staffing" },
  { value: "hospitalized", label: "Hospitalized" },
  { value: "on_hold", label: "On hold" },
  { value: "discharged", label: "Discharged" },
  { value: "test", label: "Test" },
] as const;
export const ACTIVE_CLIENT_STATUSES = ["current_staffed", "current_needs_staffing", "hospitalized", "on_hold", "not_set"] as const;
export function isActiveClient(record: { status?: string | null }): boolean { return ACTIVE_CLIENT_STATUSES.some(status => status === record.status); }
export function isOperationalClient(record: { status?: string | null }): boolean { return record.status !== "test"; }
export function matchesClientStatusTab(record: { status?: string | null }, tab: string): boolean { return tab === "test" ? record.status === "test" : isOperationalClient(record) && (tab === "all" || (record.status ?? "not_set") === tab); }
export function consolidatedClientStatus(oldStatus: string, chosenStatus?: string | null): string { return chosenStatus && chosenStatus !== "not_set" ? chosenStatus : oldStatus.toLowerCase() === "pending" ? "new_client" : oldStatus.toLowerCase() === "active" ? "not_set" : "discharged"; }
export const WEEK_DAYS = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
] as const;
export type DayKey = typeof WEEK_DAYS[number]["key"];
export type ScheduleDay = { enabled: boolean; start: string; end: string };
export type RequestedSchedule = Partial<Record<DayKey, ScheduleDay>>;
export type ClientPlanningRecord = {
  payer_type?: string | null; payer_type_other?: string | null; requested_schedule?: Json;
  requested_schedule_notes?: string | null; status?: string;
  client_status_date?: string | null; expected_return_date?: string | null; client_status_reason?: string | null;
};
export type ClientPlanningDraft = {
  payerType: string; payerOther: string; schedule: RequestedSchedule; scheduleNotes: string;
  status: string; statusDate: string; expectedReturn: string; statusReason: string;
};
export function readRequestedSchedule(value: Json | undefined): RequestedSchedule {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: RequestedSchedule = {};
  for (const day of WEEK_DAYS) {
    const row = value[day.key];
    if (row && typeof row === "object" && !Array.isArray(row)) {
      result[day.key] = { enabled: row.enabled === true, start: typeof row.start === "string" ? row.start : "", end: typeof row.end === "string" ? row.end : "" };
    }
  }
  return result;
}
export function clientPlanningDraft(record: ClientPlanningRecord = {}): ClientPlanningDraft {
  return { payerType: record.payer_type ?? "Medicaid", payerOther: record.payer_type_other ?? "", schedule: readRequestedSchedule(record.requested_schedule), scheduleNotes: record.requested_schedule_notes ?? "", status: record.status ?? "not_set", statusDate: record.client_status_date ?? "", expectedReturn: record.expected_return_date ?? "", statusReason: record.client_status_reason ?? "" };
}
function timeMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
export function requestedDayMinutes(day: ScheduleDay | undefined): number {
  if (!day?.enabled) return 0;
  const start = timeMinutes(day.start), end = timeMinutes(day.end);
  if (start === null || end === null || start === end) return 0;
  return end > start ? end - start : 1440 - start + end;
}
export function requestedWeeklyHours(schedule: RequestedSchedule): number {
  return WEEK_DAYS.reduce((total, day) => total + requestedDayMinutes(schedule[day.key]), 0) / 60;
}
export function hoursLabel(hours: number): string {
  return Number(hours.toFixed(2)).toString();
}
export function formatRequestedTime(value: string): string {
  const minutes = timeMinutes(value);
  if (minutes === null) return value;
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
export function requestedScheduleSummary(schedule: RequestedSchedule): string {
  const groups: { first: number; last: number; start: string; end: string }[] = [];
  WEEK_DAYS.forEach((day, index) => {
    const row = schedule[day.key];
    if (!row?.enabled || requestedDayMinutes(row) === 0) return;
    const prior = groups[groups.length - 1];
    if (prior && prior.last === index - 1 && prior.start === row.start && prior.end === row.end) prior.last = index;
    else groups.push({ first: index, last: index, start: row.start, end: row.end });
  });
  if (!groups.length) return "Not set";
  const summary = groups.map(g => `${WEEK_DAYS[g.first].short}${g.last === g.first ? "" : `–${WEEK_DAYS[g.last].short}`} ${formatRequestedTime(g.start)}–${formatRequestedTime(g.end)}${g.end < g.start ? " (next day)" : ""}`).join("; ");
  return `${summary} · ${hoursLabel(requestedWeeklyHours(schedule))} hrs/wk`;
}
export function clientStatusLabel(value: string | undefined): string {
  if (value === "active") return "Active (previous status)";
  if (value === "pending") return "Pending (previous status)";
  if (value === "inactive") return "Inactive (previous status)";
  return CLIENT_STATUSES.find(s => s.value === value)?.label ?? "Not set";
}
export function clientPayerLabel(record: ClientPlanningRecord): string {
  return record.payer_type === "Other" && record.payer_type_other ? `Other: ${record.payer_type_other}` : record.payer_type || "Not set";
}
export function matchesClientPayer(record: ClientPlanningRecord, filter: string): boolean {
  return filter === "all" || record.payer_type === filter;
}
export function clientStatusCounts(records: ClientPlanningRecord[]): Record<string, number> {
  const counts: Record<string, number> = { all: records.filter(isOperationalClient).length };
  for (const s of CLIENT_STATUSES) counts[s.value] = records.filter(r => matchesClientStatusTab(r, s.value)).length;
  return counts;
}
export function validateClientPlanning(draft: ClientPlanningDraft): string | null {
  if (draft.payerOther.length > 200 || draft.scheduleNotes.length > 2000 || draft.statusReason.length > 2000) return "Client planning text is too long.";
  if (!CLIENT_PAYERS.some(option => option === draft.payerType)) return "Select a valid payer type.";
  if (draft.payerType === "Other" && !draft.payerOther.trim()) return "Enter the other payer.";
  if (!CLIENT_STATUSES.some(s => s.value === draft.status)) return "Select a valid client status.";
  if (["hospitalized", "on_hold", "discharged"].includes(draft.status) && !draft.statusDate) return "Enter the status date.";
  if (["on_hold", "discharged"].includes(draft.status) && !draft.statusReason.trim()) return "Enter a reason for this client status.";
  if (draft.expectedReturn && draft.status === "hospitalized" && draft.expectedReturn < draft.statusDate) return "Expected return must be on or after the admit date.";
  for (const day of WEEK_DAYS) {
    const row = draft.schedule[day.key];
    if (row?.enabled && (timeMinutes(row.start) === null || timeMinutes(row.end) === null || row.start === row.end)) return `${day.label} needs different start and end times.`;
  }
  return null;
}
export function clientPlanningPayload(draft: ClientPlanningDraft) {
  const error = validateClientPlanning(draft);
  if (error) throw new Error(error);
  return {
    payer_type: draft.payerType, payer_type_other: draft.payerType === "Other" ? draft.payerOther.trim() : null,
    requested_schedule: draft.schedule as Json, requested_schedule_notes: draft.scheduleNotes.trim() || null,
    status: draft.status, client_status_date: draft.statusDate || null,
    expected_return_date: draft.status === "hospitalized" ? draft.expectedReturn || null : null,
    client_status_reason: ["on_hold", "discharged"].includes(draft.status) ? draft.statusReason.trim() : null,
  };
}