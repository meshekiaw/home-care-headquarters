import { isCaregiverOnlyLogin } from "./rules.ts";

type ResetInput = { caregiver_id: string; password: string };
type Result = { status: number; body: { success?: boolean; error?: string } };

export interface PasswordResetDependencies {
  authenticate: (authorization: string) => Promise<string | null>;
  isAdmin: (userId: string) => Promise<boolean>;
  validate: (input: unknown) => ResetInput | null;
  caregiverLogin: (caregiverId: string) => Promise<string | null>;
  roles: (userId: string) => Promise<string[]>;
  audit: (actorId: string, caregiverId: string, outcome: "requested" | "succeeded" | "failed") => Promise<boolean>;
  updatePassword: (userId: string, password: string) => Promise<boolean>;
}

// Dependency injection permits verifying every authorization path without touching live accounts.
export async function handlePasswordReset(
  req: Request,
  deps: PasswordResetDependencies,
): Promise<Result> {
  const fail = (status: number, error: string): Result => ({ status, body: { error } });
  if (req.method !== "POST") return fail(405, "This action requires a password submission.");
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return fail(401, "Please sign in again before setting a password.");

  const actorId = await deps.authenticate(authorization);
  if (!actorId) return fail(401, "Please sign in again before setting a password.");
  if (!(await deps.isAdmin(actorId))) return fail(403, "Only an administrator can set a caregiver password.");

  let body: unknown;
  try { body = await req.json(); } catch { return fail(400, "Enter and confirm a valid password."); }
  const input = deps.validate(body);
  if (!input) return fail(400, "Choose an existing caregiver and use a password with 8–128 characters.");

  const targetId = await deps.caregiverLogin(input.caregiver_id);
  if (!targetId) return fail(409, "This caregiver does not have a linked login. Create Login first.");
  if (targetId === actorId || !isCaregiverOnlyLogin(await deps.roles(targetId))) {
    return fail(403, "This action is only for caregiver logins, not admin or nurse accounts.");
  }

  // Do not perform a sensitive change when its initiating audit entry cannot be saved.
  if (!(await deps.audit(actorId, input.caregiver_id, "requested"))) {
    return fail(503, "The password was not changed. Please try again.");
  }
  const updated = await deps.updatePassword(targetId, input.password);
  const recorded = await deps.audit(actorId, input.caregiver_id, updated ? "succeeded" : "failed");
  if (!updated) return fail(400, "The password could not be set. Try a different strong password, or check that the login still exists.");
  if (!recorded) return fail(500, "The password was changed, but its confirmation could not be saved. Do not submit it again; check the audit log.");
  return { status: 200, body: { success: true } };
}