export const NOT_FOUND = "We couldn't find that email. Please call the office so we can update the email we have on file.";
export const BUSY = "A lot of people are signing in right now. Please wait a few minutes and try again.";
export const UNAVAILABLE = "We couldn't send your sign-in link right now. Please try again, or call the office if it keeps happening.";

export function normalizeEmail(value: string): string {
  return value.replace(/\s/g, "").toLowerCase();
}

export interface SignInDependencies {
  lookup: (email: string) => Promise<{ caregiver_id: string; user_id: string | null } | null>;
  createAccount: (email: string) => Promise<string>;
  connect: (caregiverId: string, userId: string, email: string) => Promise<void>;
  sendLink: (email: string) => Promise<void>;
}

export function isEmailRateLimit(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { status?: number; code?: string; message?: string };
  return value.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(value.code ?? "") || /rate.?limit|too many requests/i.test(value.message ?? "");
}

// Public by design: mailbox ownership is proven by redeeming the emailed link,
// never by the request. Return no caregiver IDs, roles, tokens or account details.
export async function handleTrainingSignIn(req: Request, deps: SignInDependencies) {
  const fail = (status: number, code: string, error: string) => ({ status, body: { code, error } });
  if (req.method !== "POST") return fail(405, "unavailable", UNAVAILABLE);
  let body: unknown;
  try { body = await req.json(); } catch { return fail(400, "not_found", NOT_FOUND); }
  if (!body || typeof body !== "object" || !("email" in body) || typeof body.email !== "string" || body.email.length > 320) {
    return fail(400, "not_found", NOT_FOUND);
  }
  const email = normalizeEmail(body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return fail(400, "not_found", NOT_FOUND);
  try {
    let match = await deps.lookup(email);
    if (!match) return fail(400, "not_found", NOT_FOUND);
    let userId = match.user_id;
    if (!userId) {
      try {
        userId = await deps.createAccount(email);
      } catch (error) {
        // Another request may have just created the same account. Re-read instead
        // of creating a second login or changing an existing account's email.
        if (isEmailRateLimit(error)) throw error;
        match = await deps.lookup(email);
        if (!match?.user_id) throw error;
        userId = match.user_id;
      }
    }
    await deps.connect(match.caregiver_id, userId, email);
    await deps.sendLink(email);
    return { status: 200, body: { success: true } };
  } catch (error) {
    if (isEmailRateLimit(error)) return fail(429, "email_rate_limit", BUSY);
    return fail(503, "unavailable", UNAVAILABLE);
  }
}