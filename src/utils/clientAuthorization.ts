import { formatDateOnly, isDateOnlyString } from "@/utils/dateOnly";

export const AUTHORIZATION_STEPS = [
  { value: "not_started", label: "Not started" },
  { value: "assessment_scheduled", label: "Assessment scheduled" },
  { value: "assessment_completed", label: "Assessment completed" },
  { value: "submitted", label: "Authorization submitted" },
  { value: "approved", label: "Authorization approved" },
  { value: "denied", label: "Authorization denied" },
] as const;

export interface AuthorizationProgress {
  client_id: string;
  assessment_scheduled_at?: string | null;
  assessment_completed_on?: string | null;
  submitted_on?: string | null;
  approved_on?: string | null;
  denied_on?: string | null;
  denial_reason?: string | null;
  updated_at?: string;
}
export type AuthorizationDraft = { submitted: boolean; submittedOn: string; decision: "none" | "approved" | "denied"; decisionOn: string; reason: string };

export function authorizationDraft(progress?: AuthorizationProgress | null): AuthorizationDraft {
  return { submitted: !!progress?.submitted_on, submittedOn: progress?.submitted_on ?? "", decision: progress?.approved_on ? "approved" : progress?.denied_on ? "denied" : "none", decisionOn: progress?.approved_on ?? progress?.denied_on ?? "", reason: progress?.denial_reason ?? "" };
}

export function authorizationPayload(draft: AuthorizationDraft) {
  if (draft.submitted && !isDateOnlyString(draft.submittedOn)) throw new Error("Enter the authorization submitted date.");
  if (draft.decision !== "none" && !isDateOnlyString(draft.decisionOn)) throw new Error("Enter the authorization decision date.");
  if (draft.decision === "denied" && !draft.reason.trim()) throw new Error("Enter the authorization denial reason.");
  if (draft.reason.length > 2000) throw new Error("The denial reason must be 2,000 characters or fewer.");
  if (draft.decision !== "none" && draft.submitted && draft.decisionOn < draft.submittedOn) throw new Error("The decision date cannot be before the submitted date.");
  return { submitted_on: draft.submitted ? draft.submittedOn : null, approved_on: draft.decision === "approved" ? draft.decisionOn : null, denied_on: draft.decision === "denied" ? draft.decisionOn : null, denial_reason: draft.decision === "denied" ? draft.reason.trim() : null };
}

export function authorizationStep(progress?: AuthorizationProgress | null) {
  if (progress?.denied_on) return { value: "denied", label: "Authorization denied", date: progress.denied_on };
  if (progress?.approved_on) return { value: "approved", label: "Authorization approved", date: progress.approved_on };
  if (progress?.submitted_on) return { value: "submitted", label: "Authorization submitted", date: progress.submitted_on };
  if (progress?.assessment_completed_on) return { value: "assessment_completed", label: "Assessment completed", date: progress.assessment_completed_on };
  if (progress?.assessment_scheduled_at) return { value: "assessment_scheduled", label: "Assessment scheduled", date: progress.assessment_scheduled_at };
  return { value: "not_started", label: "Not started", date: null };
}

export function authorizationWaiting(progress?: AuthorizationProgress | null, now = new Date()): boolean {
  if (!progress?.submitted_on || progress.approved_on || progress.denied_on || !isDateOnlyString(progress.submitted_on)) return false;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => today.find(p => p.type === type)?.value;
  const day = `${part("year")}-${part("month")}-${part("day")}`;
  return Math.round((Date.parse(day + "T00:00:00Z") - Date.parse(progress.submitted_on + "T00:00:00Z")) / 86400000) > 14;
}

export function authorizationDate(value?: string | null): string {
  if (!value) return "—";
  if (isDateOnlyString(value)) return formatDateOnly(value, { month: "2-digit", day: "2-digit", year: "numeric" }) ?? "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-US", { timeZone: "America/Chicago", month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function matchesAuthorizationFilter(clientStatus: string, progress: AuthorizationProgress | null | undefined, filter: string, now = new Date()) {
  if (clientStatus === "test") return false;
  return filter === "all" || (filter === "waiting" ? authorizationWaiting(progress, now) : authorizationStep(progress).value === filter);
}