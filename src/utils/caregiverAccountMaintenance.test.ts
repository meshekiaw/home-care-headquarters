import { describe, expect, it } from "vitest";
import { maintenanceSkip, normalizeMaintenanceEmail, shouldConfirmExistingMaintenanceAccount, validateMaintenanceMatch, type MaintenanceCaregiver } from "../../supabase/functions/_shared/caregiver-account-maintenance";

const caregiver: MaintenanceCaregiver = { id: "test-record", first_name: "Test", last_name: "Caregiver", status: "active", email: "test-caregiver@example.invalid", auth_user_id: null };

describe("silent caregiver account maintenance rules", () => {
  it("matches email ignoring capital letters and extra spaces", () => {
    expect(normalizeMaintenanceEmail(" Test-Caregiver @Example.Invalid \t")).toBe("test-caregiver@example.invalid");
    expect(() => validateMaintenanceMatch(caregiver, { id: "test-account", email: " TEST-Caregiver @example.invalid " }, false)).not.toThrow();
  });
  it("skips active caregivers without email", () => {
    expect(maintenanceSkip({ ...caregiver, email: " \t " })).toBe("No email on file");
  });
  it("skips Linda Tisdale's explicitly excluded email", () => {
    expect(maintenanceSkip({ ...caregiver, email: " TisdaleLinda64@GMAI.com " })).toBe("Linda Tisdale: email needs correction");
  });
  it("does not allow accounts unmatched to the active caregiver", () => {
    expect(() => validateMaintenanceMatch(caregiver, { id: "other", email: "other@example.invalid" }, false)).toThrow();
    expect(maintenanceSkip({ ...caregiver, status: "inactive" })).toBe("Inactive caregiver");
  });
  it("does not overwrite existing caregiver links", () => {
    expect(() => validateMaintenanceMatch({ ...caregiver, auth_user_id: "existing" }, { id: "different", email: caregiver.email }, false)).toThrow("conflict");
    expect(() => validateMaintenanceMatch(caregiver, { id: "existing", email: caregiver.email }, true)).toThrow("conflict");
  });
  it("confirms only the explicitly named existing account if needed", () => {
    expect(shouldConfirmExistingMaintenanceAccount(" JohneisePridgeon1981@gmail.com ", false)).toBe(true);
    expect(shouldConfirmExistingMaintenanceAccount("johneisepridgeon1981@gmail.com", true)).toBe(false);
    expect(shouldConfirmExistingMaintenanceAccount("marionupkins@yahoo.com", false)).toBe(false);
  });
});