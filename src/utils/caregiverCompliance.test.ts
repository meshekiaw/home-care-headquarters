import { describe, expect, it, vi } from "vitest";
import { maltreatmentExpiration } from "./caregiverCompliance";
import { parseCSV, validateAndTransform } from "./csvParser";
import { formatCaregiverForExport } from "./csvExport";
import { getExpiryStatus } from "./expiryStatus";
import { canArchive, canRead, canUpload, canUseDocuments, ACCESS_TICKET_SECONDS } from "../../supabase/functions/caregiver-documents/access";

describe("Caregiver maltreatment dates", () => {
  it("expires exactly two calendar years after a check", () => {
    expect(maltreatmentExpiration("2026-01-12")).toBe("2028-01-12");
    expect(maltreatmentExpiration("2024-02-29")).toBe("2026-02-28");
  });
  it("leaves missing check dates blank", () => {
    expect(maltreatmentExpiration(null)).toBeNull();
    expect(maltreatmentExpiration("")).toBeNull();
  });
  it("imports the old check field as child and old expiration field as adult check", () => {
    const result = validateAndTransform(parseCSV("first_name,last_name,maltreatment_check_date,maltreatment_expiration_date\nExample,Person,2026-01-12,2025-11-04"));
    expect(result.caregivers[0].child_maltreatment_check_date).toBe("2026-01-12");
    expect(result.caregivers[0].adult_maltreatment_check_date).toBe("2025-11-04");
  });
  it("does not accept typed expiration dates in corrected imports", () => {
    const result = validateAndTransform(parseCSV("first_name,last_name,child_maltreatment_check_date,adult_maltreatment_check_date,child_maltreatment_expiration_date\nExample,Person,2026-01-12,2026-03-01,2099-01-01"));
    expect(result.caregivers[0].child_maltreatment_check_date).toBe("2026-01-12");
    expect(result.caregivers[0].adult_maltreatment_check_date).toBe("2026-03-01");
    expect(result.caregivers[0]).not.toHaveProperty("child_maltreatment_expiration_date");
  });
  it("exports separate check and calculated expiration values", () => {
    const record = formatCaregiverForExport({ first_name: "Example", last_name: "Person", status: "active", created_at: "2026-01-01", child_maltreatment_check_date: "2026-01-12", child_maltreatment_expiration_date: "2028-01-12", adult_maltreatment_check_date: "2026-03-01", adult_maltreatment_expiration_date: "2028-03-01" });
    expect(record.child_maltreatment_expiration_date).toBe("2028-01-12");
    expect(record.adult_maltreatment_expiration_date).toBe("2028-03-01");
    expect(record).not.toHaveProperty("maltreatment_expiration_date");
  });
  it("warns on calculated dates, not the adult check date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T12:00:00"));
    expect(getExpiryStatus(maltreatmentExpiration("2026-01-12"))).toBe("ok");
    expect(getExpiryStatus(maltreatmentExpiration("2024-11-01"))).toBe("expiring");
    expect(getExpiryStatus(maltreatmentExpiration("2024-10-22"))).toBe("expired");
    vi.useRealTimers();
  });
});

describe("Private caregiver documents", () => {
  it("permits caregivers to upload only their own ID, SSN card and certificate", () => {
    for (const step of ["photo_id", "social_security_card", "certificate"]) expect(canUpload(["caregiver"], true, step, false)).toBe(true);
    expect(canUpload(["caregiver"], false, "photo_id", false)).toBe(false);
    expect(canUpload(["caregiver"], true, "background_check", false)).toBe(false);
  });
  it("denies caregiver reads of office uploads and other caregivers", () => {
    expect(canRead(["caregiver"], true, true)).toBe(true);
    expect(canRead(["caregiver"], true, false)).toBe(false);
    expect(canRead(["caregiver"], false, true)).toBe(false);
  });
  it("denies all document operations to nurses and roleless users", () => {
    for (const roles of [["nurse"], [], ["caregiver", "nurse"]]) {
      expect(canUseDocuments(roles)).toBe(false);
      expect(canRead(roles, true, true)).toBe(false);
      expect(canUpload(roles, true, "photo_id", false)).toBe(false);
    }
  });
  it("prevents caregivers replacing or deleting approved files", () => {
    expect(canUpload(["caregiver"], true, "photo_id", true)).toBe(false);
    expect(canArchive(["caregiver"], true, true, true)).toBe(false);
    expect(canArchive(["admin"], false, false, true)).toBe(true);
  });
  it("allows admins all allowed document categories and caregiver folders", () => {
    expect(canUpload(["admin"], false, "background_check", true)).toBe(true);
    expect(canRead(["admin"], false, false)).toBe(true);
  });
  it("limits temporary access to sixty seconds", () => {
    expect(ACCESS_TICKET_SECONDS).toBe(60);
  });
});