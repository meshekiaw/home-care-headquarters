export interface QuizResetStatus {
  assignment_id: string;
  caregiver_id: string;
  course_id: string;
  session_number: number | null;
  session_title: string;
  assignment_status: string;
  max_attempts: number | null;
  total_attempts: number;
  attempts_since_reset: number;
  failed_since_reset: number;
  last_reset_at: string | null;
  needs_reset: boolean;
}

export interface QuizAttemptRow {
  id: string;
  assignment_id: string;
  attempt_number: number;
  score: number;
  passing_score: number;
  passed: boolean;
  attempted_at: string;
}

export interface QuizResetLogRow {
  id: string;
  assignment_id: string;
  caregiver_id: string;
  course_id: string;
  reset_by_name: string;
  attempts_before: number;
  failed_attempts_before: number;
  created_at: string;
}

/** An attempt is "before reset" when any later reset of the same session exists. */
export function isBeforeReset(attempt: Pick<QuizAttemptRow, "assignment_id" | "attempted_at">, resets: Pick<QuizResetLogRow, "assignment_id" | "created_at">[]) {
  const at = new Date(attempt.attempted_at).getTime();
  return resets.some((r) => r.assignment_id === attempt.assignment_id && at <= new Date(r.created_at).getTime());
}

export function caregiversNeedingReset(rows: Pick<QuizResetStatus, "caregiver_id" | "needs_reset">[]) {
  return new Set(rows.filter((r) => r.needs_reset).map((r) => r.caregiver_id));
}

export function resetConfirmText(sessionName: string, caregiverName: string) {
  return `Reset the ${sessionName} quiz for ${caregiverName}? She’ll be able to take it again. Her video progress stays.`;
}
