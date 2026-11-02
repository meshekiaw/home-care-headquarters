import { describe, expect, it, vi } from "vitest";
import { handleCaregiverAccess, type AccessDependencies, type AccessSnapshot } from "../../supabase/functions/caregiver-sign-in-access/handler";
import { matchesAccessFilter, type CaregiverAccess } from "./caregiverSignInAccess";
const caregiver = "11111111-1111-4111-8111-111111111111", email = "test-caregiver@example.invalid";
const input = { caregiver_id: caregiver, confirmed_email: email, confirmed_name: "Test Caregiver", confirmed: true as const };
const snapshot: AccessSnapshot = { caregiver_id: caregiver, caregiver_name: "Test Caregiver", email, state: "no_account", problem: null, account_id: null };
const request = (body: unknown = input, authorization = "Bearer synthetic-session") => new Request("https://example.invalid/access", { method: "POST", headers: { Authorization: authorization, "Content-Type": "application/json" }, body: JSON.stringify(body) });
function dependencies(overrides: Partial<AccessDependencies> = {}) {
  return {
    authenticate: vi.fn(async () => "synthetic-admin"), isAdmin: vi.fn(async () => true),
    validate: vi.fn((body: unknown) => JSON.stringify(body) === JSON.stringify(input) ? input : null),
    snapshot: vi.fn(async () => snapshot), record: vi.fn(async () => {}),
    createAccount: vi.fn(async () => "synthetic-caregiver-account"), finish: vi.fn(async () => ({ state: "ready" })),
    requestId: () => "synthetic-request", ...overrides,
  };
}
describe("admin caregiver access handler (synthetic accounts only)", () => {
  it("rejects signed-out callers before any lookup or change", async () => {
    const deps = dependencies(); expect((await handleCaregiverAccess(request(input, ""), deps)).status).toBe(401);
    expect(deps.snapshot).not.toHaveBeenCalled(); expect(deps.createAccount).not.toHaveBeenCalled();
  });
  it("rejects an invalid session", async () => {
    const deps = dependencies({ authenticate: vi.fn(async () => null) }); expect((await handleCaregiverAccess(request(), deps)).status).toBe(401); expect(deps.snapshot).not.toHaveBeenCalled();
  });
  it("rejects a signed-in caregiver before any target lookup", async () => {
    const deps = dependencies({ isAdmin: vi.fn(async () => false) }); expect((await handleCaregiverAccess(request(), deps)).status).toBe(403);
    expect(deps.snapshot).not.toHaveBeenCalled(); expect(deps.record).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation", async () => {
    const deps = dependencies(); expect((await handleCaregiverAccess(request({ ...input, confirmed: false }), deps)).status).toBe(400);
    expect(deps.createAccount).not.toHaveBeenCalled(); expect(deps.finish).not.toHaveBeenCalled();
  });
  it.each([{ email: "changed@example.invalid" }, { caregiver_name: "Changed Test Name" }])("rejects a stale confirmed identity %j", async changed => {
    const deps = dependencies({ snapshot: vi.fn(async () => ({ ...snapshot, ...changed })) }); expect((await handleCaregiverAccess(request(), deps)).status).toBe(409);
    expect(deps.record).not.toHaveBeenCalled(); expect(deps.createAccount).not.toHaveBeenCalled();
  });
  it("does not create an account when there is no email on file", async () => {
    const deps = dependencies({ snapshot: vi.fn(async () => ({ ...snapshot, email: "" })) }); expect((await handleCaregiverAccess(request(), deps)).status).toBe(409); expect(deps.createAccount).not.toHaveBeenCalled();
  });
  it("rejects a nurse account before any writes", async () => {
    const deps = dependencies({ snapshot: vi.fn(async () => ({ ...snapshot, problem: "This email belongs to a nurse account. Use a different email for her caregiver access." })) });
    expect((await handleCaregiverAccess(request(), deps)).status).toBe(409); expect(deps.record).not.toHaveBeenCalled(); expect(deps.finish).not.toHaveBeenCalled();
  });
  it("rejects a conflicting caregiver and returns the server's identified caregiver", async () => {
    const deps = dependencies({ snapshot: vi.fn(async () => ({ ...snapshot, problem: "This email is already connected to Other Test Caregiver." })) });
    const result = await handleCaregiverAccess(request(), deps); expect(result.status).toBe(409); expect(result.body).toHaveProperty("error", "This email is already connected to Other Test Caregiver.");
    expect(deps.createAccount).not.toHaveBeenCalled(); expect(deps.finish).not.toHaveBeenCalled();
  });
  it("records intent before passwordless account creation then finalizes the server-resolved identity", async () => {
    const deps = dependencies(); expect((await handleCaregiverAccess(request(), deps)).status).toBe(200);
    expect(deps.createAccount).toHaveBeenCalledExactlyOnceWith(email);
    expect(deps.record.mock.invocationCallOrder[0]).toBeLessThan(deps.createAccount.mock.invocationCallOrder[0]);
    expect(deps.record).toHaveBeenNthCalledWith(2, "synthetic-admin", caregiver, email, "synthetic-request", "account_created", "Confirmed account created without a password or email.");
    expect(deps.finish).toHaveBeenCalledExactlyOnceWith("synthetic-admin", caregiver, email, "synthetic-caregiver-account", "synthetic-request");
  });
  it("fixes existing accounts without any Auth write", async () => {
    const deps = dependencies({ snapshot: vi.fn(async () => ({ ...snapshot, account_id: "existing-account", state: "not_set_up" })) });
    expect((await handleCaregiverAccess(request(), deps)).status).toBe(200); expect(deps.createAccount).not.toHaveBeenCalled();
    expect(deps.finish).toHaveBeenCalledWith("synthetic-admin", caregiver, email, "existing-account", "synthetic-request");
  });
  it("makes no account change if intent auditing fails", async () => {
    const deps = dependencies({ record: vi.fn(async () => { throw new Error("Unavailable"); }) });
    await expect(handleCaregiverAccess(request(), deps)).rejects.toThrow("Unavailable"); expect(deps.createAccount).not.toHaveBeenCalled(); expect(deps.finish).not.toHaveBeenCalled();
  });
  it("records failed finalization instead of falsely returning success", async () => {
    const deps = dependencies({ finish: vi.fn(async () => { throw new Error("Conflict"); }) }); expect((await handleCaregiverAccess(request(), deps)).status).toBe(409);
    expect(deps.record).toHaveBeenLastCalledWith("synthetic-admin", caregiver, email, "synthetic-request", "failed", "Setup did not finish. Review current access before trying again.");
  });
  it("handles concurrent account creation by rechecking the server email lookup", async () => {
    const deps = dependencies({ createAccount: vi.fn(async () => null), snapshot: vi.fn().mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ ...snapshot, account_id: "concurrently-created" }) });
    expect((await handleCaregiverAccess(request(), deps)).status).toBe(200); expect(deps.finish).toHaveBeenCalledWith("synthetic-admin", caregiver, email, "concurrently-created", "synthetic-request");
  });
});
describe("sign-in access roster filter", () => {
  it.each(["ready", "no_account", "not_set_up", "no_email"] as const)("matches only the %s status", state => {
    const access = { state } as CaregiverAccess; expect(matchesAccessFilter(access, state)).toBe(true);
    expect(matchesAccessFilter(access, state === "ready" ? "no_email" : "ready")).toBe(false);
  });
  it("does not classify unknown/loading access as no account", () => { expect(matchesAccessFilter(undefined, "no_account")).toBe(false); expect(matchesAccessFilter(undefined, "all")).toBe(true); });
});