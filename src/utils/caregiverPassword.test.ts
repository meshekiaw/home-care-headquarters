import { describe, expect, it, vi } from "vitest";
import { caregiverPasswordSchema } from "./caregiverPassword";
import { handlePasswordReset, type PasswordResetDependencies } from "../../supabase/functions/caregiver-login-password/handler";
import { isCaregiverOnlyLogin } from "../../supabase/functions/caregiver-login-password/rules";

const caregiverId = "11111111-1111-4111-8111-111111111111";
const input = { caregiver_id: caregiverId, password: "unit-test-password" };
const request = (body: unknown = input, authorization = "Bearer test-only-token") => new Request("https://example.invalid/password", {
  method: "POST", headers: { Authorization: authorization, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
function dependencies(overrides: Partial<PasswordResetDependencies> = {}) {
  return {
    authenticate: vi.fn(async () => "test-admin-id"),
    isAdmin: vi.fn(async () => true),
    validate: vi.fn((body: unknown) => {
      if (!body || typeof body !== "object" || !("caregiver_id" in body) || !("password" in body)) return null;
      if (body.caregiver_id !== caregiverId || typeof body.password !== "string") return null;
      return { caregiver_id: body.caregiver_id, password: body.password };
    }),
    caregiverLogin: vi.fn(async () => "test-caregiver-id"),
    roles: vi.fn(async () => ["caregiver"]),
    audit: vi.fn(async () => true),
    updatePassword: vi.fn(async () => true),
    ...overrides,
  };
}

describe("caregiver password confirmation", () => {
  const values = { password: input.password, confirmPassword: input.password, confirmed: true };
  it("requires admin confirmation before replacement", () => {
    expect(caregiverPasswordSchema.safeParse({ ...values, confirmed: false }).success).toBe(false);
  });
  it("requires matching password entries", () => {
    expect(caregiverPasswordSchema.safeParse({ ...values, confirmPassword: "different-password" }).success).toBe(false);
  });
  it("rejects seven characters but accepts eight", () => {
    expect(caregiverPasswordSchema.safeParse({ ...values, password: "1234567", confirmPassword: "1234567" }).success).toBe(false);
    expect(caregiverPasswordSchema.safeParse({ ...values, password: "12345678", confirmPassword: "12345678" }).success).toBe(true);
  });
  it("rejects blank passwords and passwords over 128 characters", () => {
    for (const password of ["        ", "x".repeat(129)]) {
      expect(caregiverPasswordSchema.safeParse({ ...values, password, confirmPassword: password }).success).toBe(false);
    }
  });
});

describe("admin-only caregiver password changes (mock accounts only)", () => {
  it("rejects requests without a bearer session before looking up any caregiver", async () => {
    const deps = dependencies();
    expect((await handlePasswordReset(request(input, ""), deps)).status).toBe(401);
    expect(deps.authenticate).not.toHaveBeenCalled();
    expect(deps.caregiverLogin).not.toHaveBeenCalled();
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
  it("rejects invalid sessions", async () => {
    const deps = dependencies({ authenticate: vi.fn(async () => null) });
    expect((await handlePasswordReset(request(), deps)).status).toBe(401);
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
  it("denies caregivers and nurses without looking up the target", async () => {
    const deps = dependencies({ isAdmin: vi.fn(async () => false) });
    expect((await handlePasswordReset(request(), deps)).status).toBe(403);
    expect(deps.caregiverLogin).not.toHaveBeenCalled();
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
  it("rejects invalid input before any password change", async () => {
    const deps = dependencies({ validate: vi.fn(() => null) });
    expect((await handlePasswordReset(request({ user_id: "arbitrary-target" }), deps)).status).toBe(400);
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
  it("cannot reset a record with no existing linked login", async () => {
    const deps = dependencies({ caregiverLogin: vi.fn(async () => null) });
    expect((await handlePasswordReset(request(), deps)).status).toBe(409);
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
  it.each([["caregiver", "admin"], ["caregiver", "nurse"], ["admin"], ["nurse"], []])("protects non-caregiver-only roles %j", async (...roles) => {
    const deps = dependencies({ roles: vi.fn(async () => roles as string[]) });
    expect((await handlePasswordReset(request(), deps)).status).toBe(403);
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
  it("never changes the requesting admin's own login", async () => {
    const deps = dependencies({ caregiverLogin: vi.fn(async () => "test-admin-id") });
    expect((await handlePasswordReset(request(), deps)).status).toBe(403);
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
  it("blocks password changes when the initiating audit cannot be recorded", async () => {
    const deps = dependencies({ audit: vi.fn(async () => false) });
    expect((await handlePasswordReset(request(), deps)).status).toBe(503);
    expect(deps.updatePassword).not.toHaveBeenCalled();
  });
  it("resets only the server-resolved linked account and audits no password", async () => {
    const audit = vi.fn(async () => true);
    const deps = dependencies({ audit });
    const result = await handlePasswordReset(request(), deps);
    expect(result).toEqual({ status: 200, body: { success: true } });
    expect(deps.caregiverLogin).toHaveBeenCalledWith(caregiverId);
    expect(deps.updatePassword).toHaveBeenCalledExactlyOnceWith("test-caregiver-id", input.password);
    expect(audit.mock.calls).toEqual([
      ["test-admin-id", caregiverId, "requested"],
      ["test-admin-id", caregiverId, "succeeded"],
    ]);
    expect(JSON.stringify(result)).not.toContain(input.password);
    expect(JSON.stringify(audit.mock.calls)).not.toContain(input.password);
  });
  it("does not report a failed authentication update as success", async () => {
    const deps = dependencies({ updatePassword: vi.fn(async () => false) });
    expect((await handlePasswordReset(request(), deps)).status).toBe(400);
    expect(deps.audit).toHaveBeenLastCalledWith("test-admin-id", caregiverId, "failed");
  });
  it("does not return success when the final audit is missing", async () => {
    const deps = dependencies({ audit: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false) });
    const result = await handlePasswordReset(request(), deps);
    expect(result.status).toBe(500);
    expect(result.body.success).toBeUndefined();
    expect(deps.updatePassword).toHaveBeenCalledTimes(1);
  });
  it("recognizes only caregiver-only logins as eligible", () => {
    expect(isCaregiverOnlyLogin(["caregiver"])).toBe(true);
    expect(isCaregiverOnlyLogin(["caregiver", "admin"])).toBe(false);
    expect(isCaregiverOnlyLogin(["caregiver", "nurse"])).toBe(false);
  });
});