import { describe, expect, it, vi } from "vitest";
import { handleCaregiverAccess, type AccessDependencies } from "../../supabase/functions/caregiver-sign-in-access/handler";
const input = { caregiver_id: "test-caregiver", confirmed_email: "test-caregiver@example.invalid", confirmed_name: "Test Caregiver", confirmed: true as const, action: "update_email" as const, confirmed_account_email: "old-test@example.invalid" };
describe("connected email repair authorization", () => {
  it("permits an explicitly confirmed mismatched-email repair without creating another account", async () => {
    const repair = vi.fn(async () => ({ state: "ready" }));
    const deps = { authenticate: vi.fn(async () => "synthetic-admin"), isAdmin: vi.fn(async () => true), validate: () => input,
      snapshot: async () => ({ caregiver_id: input.caregiver_id, caregiver_name: input.confirmed_name, email: input.confirmed_email, account_id: null, state: "no_account", problem: "This record is connected to a different sign-in account. Access needs office review.", email_mismatch: true, connected_account_email: input.confirmed_account_email, can_update_email: true }),
      record: vi.fn(async () => {}), createAccount: vi.fn(async () => "unused"), finish: vi.fn(), repair, requestId: () => "test-request" } as AccessDependencies;
    const req = new Request("https://example.invalid", { method: "POST", headers: { Authorization: "Bearer synthetic" }, body: JSON.stringify(input) });
    const result = await handleCaregiverAccess(req, deps);
    expect(result.status).toBe(200); expect(repair).toHaveBeenCalledTimes(1); expect(deps.createAccount).not.toHaveBeenCalled();
  });
});