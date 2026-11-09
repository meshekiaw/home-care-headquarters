export type AccessSnapshot = {
  caregiver_id: string; caregiver_name: string; email: string; account_id: string | null;
  state: string; problem: string | null;
  email_mismatch?: boolean; connected_account_email?: string | null; can_update_email?: boolean; can_switch_account?: boolean;
};
export type AccessInput = { caregiver_id: string; confirmed_email: string; confirmed_name: string; confirmed: true; action?: "update_email" | "switch_account"; confirmed_account_email?: string };
export interface AccessDependencies {
  authenticate: (authorization: string) => Promise<string | null>;
  isAdmin: (actor: string) => Promise<boolean>;
  validate: (body: unknown) => AccessInput | null;
  snapshot: (actor: string, caregiver: string) => Promise<AccessSnapshot>;
  record: (actor: string, caregiver: string, email: string, request: string, event: string, detail?: string) => Promise<void>;
  createAccount: (email: string) => Promise<string | null>;
  finish: (actor: string, caregiver: string, email: string, account: string, request: string) => Promise<unknown>;
  requestId: () => string;
  repair?: (actor: string, input: AccessInput, request: string) => Promise<unknown>;
}

// Authentication and confirmation precede every privileged lookup or change.
export async function handleCaregiverAccess(req: Request, deps: AccessDependencies) {
  const fail = (status: number, error: string) => ({ status, body: { error } });
  if (req.method !== "POST") return fail(405, "Use the caregiver access confirmation.");
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return fail(401, "Please sign in again before managing access.");
  const actor = await deps.authenticate(authorization);
  if (!actor) return fail(401, "Please sign in again before managing access.");
  if (!(await deps.isAdmin(actor))) return fail(403, "Only admins can manage caregiver sign-in access.");
  let body: unknown;
  try { body = await req.json(); } catch { return fail(400, "Confirm the caregiver name and email first."); }
  const input = deps.validate(body);
  if (!input) return fail(400, "Confirm the caregiver name and email first.");
  let snapshot = await deps.snapshot(actor, input.caregiver_id);
  if (!snapshot.email) return fail(409, "Add an email to her profile first.");
  if (snapshot.email !== input.confirmed_email || snapshot.caregiver_name !== input.confirmed_name) {
    return fail(409, "The profile changed. Review access and confirm again.");
  }
  const requestId = deps.requestId();
  if (input.action) {
    if (!snapshot.email_mismatch || snapshot.connected_account_email !== input.confirmed_account_email) return fail(409, "The connected account changed. Refresh access and confirm again.");
    if ((input.action === "update_email" && !snapshot.can_update_email) || (input.action === "switch_account" && !snapshot.can_switch_account)) return fail(409, snapshot.problem || "This email repair is not available. Refresh access.");
    if (!deps.repair) return fail(503, "Email repair is temporarily unavailable.");
    try { return { status: 200, body: { success: true, ...await deps.repair(actor, input, requestId) as object } }; }
    catch (error) { return fail(409, error instanceof Error ? error.message : "Email repair did not finish. Review the access log."); }
  }
  if (snapshot.email_mismatch) return fail(409, "Use the connected-account email repair and confirm both emails.");
  if (snapshot.problem) return fail(409, snapshot.problem);
  await deps.record(actor, input.caregiver_id, snapshot.email, requestId, "requested");
  try {
    let account = snapshot.account_id;
    if (!account) {
      // Auth Admin createUser is the only Auth write: no password or email-sending method.
      account = await deps.createAccount(snapshot.email);
      if (account) await deps.record(actor, input.caregiver_id, snapshot.email, requestId, "account_created", "Confirmed account created without a password or email.");
      else {
        // Concurrent creation is resolved by the exact server-side email lookup, not a guessed user.
        snapshot = await deps.snapshot(actor, input.caregiver_id);
        account = snapshot.account_id;
      }
    }
    if (!account) throw new Error("Account creation could not be confirmed.");
    const access = await deps.finish(actor, input.caregiver_id, input.confirmed_email, account, requestId);
    return { status: 200, body: { success: true, access } };
  } catch {
    await deps.record(actor, input.caregiver_id, input.confirmed_email, requestId, "failed", "Setup did not finish. Review current access before trying again.");
    const current = await deps.snapshot(actor, input.caregiver_id);
    return fail(409, current.problem || "Access setup did not finish. Check the current status and log before trying again.");
  }
}