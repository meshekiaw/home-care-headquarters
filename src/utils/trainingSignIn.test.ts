import { describe, expect, it, vi } from "vitest";
import { handleTrainingSignIn, normalizeEmail, type SignInDependencies } from "../../supabase/functions/caregiver-training-sign-in/handler";
import { sendTrainingEmail } from "../../supabase/functions/caregiver-training-sign-in/email";

const email = "test-caregiver@example.invalid";
const caregiverId = "test-caregiver-record";
const userId = "test-caregiver-user";
const request = (value: unknown = { email }) => new Request("https://example.invalid/training-sign-in", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
});
function dependencies(overrides: Partial<SignInDependencies> = {}) {
  return {
    lookup: vi.fn(async () => ({ caregiver_id: caregiverId, user_id: userId })),
    createAccount: vi.fn(async () => userId),
    connect: vi.fn(async () => undefined),
    sendLink: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("caregiver training sign-in (mock accounts only)", () => {
  it("reports an office update without creating, connecting or emailing a mismatched account", async () => {
    const deps = dependencies({ lookup: vi.fn(async () => ({ caregiver_id: caregiverId, user_id: null, office_update: true })) });
    const result = await handleTrainingSignIn(request(), deps);
    expect(result).toEqual({ status: 409, body: { code: "office_update", error: "We found your record, but your sign-in needs an update from the office. Please call the office." } });
    expect(deps.createAccount).not.toHaveBeenCalled(); expect(deps.connect).not.toHaveBeenCalled(); expect(deps.sendLink).not.toHaveBeenCalled();
  });
  it("normalizes capitalization and extra spaces before matching and sending", async () => {
    const deps = dependencies();
    const result = await handleTrainingSignIn(request({ email: "  Test-Caregiver @ EXAMPLE.invalid  " }), deps);
    expect(result.status).toBe(200);
    expect(deps.lookup).toHaveBeenCalledExactlyOnceWith(email);
    expect(deps.sendLink).toHaveBeenCalledExactlyOnceWith(email, userId);
    expect(normalizeEmail("  TEST-CAREGIVER@example.invalid\t")).toBe(email);
  });
  it("creates an account only after an active caregiver match and connects before sending", async () => {
    const calls: string[] = [];
    const deps = dependencies({
      lookup: vi.fn(async () => { calls.push("match"); return { caregiver_id: caregiverId, user_id: null }; }),
      createAccount: vi.fn(async () => { calls.push("create"); return userId; }),
      connect: vi.fn(async () => { calls.push("connect"); }),
      sendLink: vi.fn(async () => { calls.push("send"); }),
    });
    expect((await handleTrainingSignIn(request(), deps)).status).toBe(200);
    expect(calls).toEqual(["match", "create", "connect", "send"]);
    expect(deps.createAccount).toHaveBeenCalledExactlyOnceWith(email);
    expect(deps.connect).toHaveBeenCalledExactlyOnceWith(caregiverId, userId, email);
  });
  it("repairs an existing account instead of replacing it", async () => {
    const deps = dependencies();
    expect((await handleTrainingSignIn(request(), deps)).status).toBe(200);
    expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.connect).toHaveBeenCalledExactlyOnceWith(caregiverId, userId, email);
    expect(deps.sendLink).toHaveBeenCalledExactlyOnceWith(email, userId);
  });
  it("unmatched or inactive caregiver emails create no account and send no link", async () => {
    const deps = dependencies({ lookup: vi.fn(async () => null) });
    expect((await handleTrainingSignIn(request(), deps)).status).toBe(400);
    expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.connect).not.toHaveBeenCalled();
    expect(deps.sendLink).not.toHaveBeenCalled();
  });
  it("invalid email input cannot reach account creation or email sending", async () => {
    for (const input of [{ email: "not-an-email" }, { email: 123 }, {}, { email: "a".repeat(321) }]) {
      const deps = dependencies();
      expect((await handleTrainingSignIn(request(input), deps)).status).toBe(400);
      expect(deps.lookup).not.toHaveBeenCalled();
      expect(deps.createAccount).not.toHaveBeenCalled();
      expect(deps.sendLink).not.toHaveBeenCalled();
    }
  });
  it("conflicting caregiver links fail closed without sending", async () => {
    const deps = dependencies({ connect: vi.fn(async () => { throw new Error("identity conflict"); }) });
    expect((await handleTrainingSignIn(request(), deps)).status).toBe(503);
    expect(deps.sendLink).not.toHaveBeenCalled();
  });
  it("recovers a simultaneous account creation by re-reading the matched account", async () => {
    const lookup = vi.fn().mockResolvedValueOnce({ caregiver_id: caregiverId, user_id: null }).mockResolvedValueOnce({ caregiver_id: caregiverId, user_id: userId });
    const deps = dependencies({ lookup, createAccount: vi.fn(async () => { throw { code: "email_exists" }; }) });
    expect((await handleTrainingSignIn(request(), deps)).status).toBe(200);
    expect(deps.createAccount).toHaveBeenCalledTimes(1);
    expect(deps.connect).toHaveBeenCalledExactlyOnceWith(caregiverId, userId, email);
    expect(deps.sendLink).toHaveBeenCalledTimes(1);
  });
  it("handles the hourly email cap without reporting success", async () => {
    const deps = dependencies({ sendLink: vi.fn(async () => { throw { status: 429, code: "over_email_send_rate_limit" }; }) });
    const result = await handleTrainingSignIn(request(), deps);
    expect(result.status).toBe(429);
    expect(result.body.code).toBe("email_rate_limit");
    expect(result.body.success).toBeUndefined();
  });
  it("does not disguise an unrelated creation failure as a duplicate account race", async () => {
    const deps = dependencies({
      lookup: vi.fn(async () => ({ caregiver_id: caregiverId, user_id: null })),
      createAccount: vi.fn(async () => { throw { code: "unexpected_failure" }; }),
    });
    expect((await handleTrainingSignIn(request(), deps)).status).toBe(503);
    expect(deps.lookup).toHaveBeenCalledTimes(1);
    expect(deps.connect).not.toHaveBeenCalled();
    expect(deps.sendLink).not.toHaveBeenCalled();
  });
  it("hides auth and server details on other failures", async () => {
    const deps = dependencies({ sendLink: vi.fn(async () => { throw new Error("Signups not allowed for otp."); }) });
    const result = await handleTrainingSignIn(request(), deps);
    expect(result.status).toBe(503);
    expect(result.body.code).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("otp");
  });
  it("does not expose the matched account, record or tokens", async () => {
    expect(await handleTrainingSignIn(request(), dependencies())).toEqual({ status: 200, body: { success: true } });
  });
});

describe("email confirmation is retained with public signup disabled", () => {
  it("uses a confirmation resend for an unconfirmed new or existing account", async () => {
    const deps = { confirmed: vi.fn(async () => false), magicLink: vi.fn(async () => undefined), confirmationLink: vi.fn(async () => undefined) };
    await sendTrainingEmail(email, userId, deps);
    expect(deps.confirmed).toHaveBeenCalledExactlyOnceWith(userId, email);
    expect(deps.magicLink).not.toHaveBeenCalled();
    expect(deps.confirmationLink).toHaveBeenCalledExactlyOnceWith(email);
  });
  it("uses an existing-user magic link only after checking confirmation", async () => {
    const deps = { confirmed: vi.fn(async () => true), magicLink: vi.fn(async () => undefined), confirmationLink: vi.fn(async () => undefined) };
    await sendTrainingEmail(email, userId, deps);
    expect(deps.magicLink).toHaveBeenCalledExactlyOnceWith(email);
    expect(deps.confirmationLink).not.toHaveBeenCalled();
  });
  it("sends nothing if the auth identity check fails", async () => {
    const deps = { confirmed: vi.fn(async () => { throw new Error("identity changed"); }), magicLink: vi.fn(async () => undefined), confirmationLink: vi.fn(async () => undefined) };
    await expect(sendTrainingEmail(email, userId, deps)).rejects.toThrow();
    expect(deps.magicLink).not.toHaveBeenCalled();
    expect(deps.confirmationLink).not.toHaveBeenCalled();
  });
});