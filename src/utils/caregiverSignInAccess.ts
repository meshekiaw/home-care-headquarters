export const ACCESS_LABELS = {
  ready: "Ready", no_account: "No account", not_set_up: "Account not set up", no_email: "No email on file",
} as const;
export type AccessState = keyof typeof ACCESS_LABELS;
export type AccessEvent = {
  id: string; actor_email: string; email: string; caregiver_name: string;
  event: "requested" | "account_created" | "succeeded" | "failed"; detail: string | null; created_at: string;
};
export type CaregiverAccess = {
  caregiver_id: string; caregiver_name: string; email: string; account_email: string | null;
  state: AccessState; problem: string | null; history?: AccessEvent[];
  email_mismatch?: boolean; connected_account_email?: string | null; can_update_email?: boolean; can_switch_account?: boolean;
};
export function matchesAccessFilter(access: CaregiverAccess | undefined, filter: "all" | AccessState) {
  return filter === "all" || access?.state === filter;
}