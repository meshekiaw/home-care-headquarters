import { describe, it, expect } from "vitest";
import { canReviewStep, reviewSchema, certificateSchema, replacementNoteSchema, officeSavePayload } from "./adminOnboarding";
import { canRead, canUpload } from "../../supabase/functions/caregiver-documents/access";

describe("admin onboarding rules", () => {
  const review = { action: "approve", note: "", originalSeen: false, originalDate: "" };
  it("requires a caregiver-visible reason for send-back", () => {
    expect(reviewSchema.safeParse({ ...review, action: "send_back" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...review, action: "send_back", note: "Please upload the back." }).success).toBe(true);
  });
  it("requires a received-paperwork note for approval without upload", () => {
    expect(reviewSchema.safeParse({ ...review, action: "paper_approve", note: "  " }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...review, action: "paper_approve", note: "Photo ID received on paper." }).success).toBe(true);
  });
  it("requires a real date when original seen is checked", () => {
    expect(reviewSchema.safeParse({ ...review, originalSeen: true }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...review, originalSeen: true, originalDate: "2026-02-30" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...review, originalSeen: true, originalDate: "2026-10-23" }).success).toBe(true);
  });
  it("allows caregiver review of steps 1–6 only, never orientation", () => {
    expect([1, 2, 3, 4, 5, 6].every(canReviewStep)).toBe(true);
    expect([0, 7, 8, 9, 10, 11, 12, 13].some(canReviewStep)).toBe(false);
  });
  it("requires certificate name and a document link", () => {
    const certificate = { name: "Test Certificate", number: "", issue_date: "", expiry_date: "", document_id: "00000000-0000-4000-8000-000000000001" };
    expect(certificateSchema.safeParse(certificate).success).toBe(true);
    expect(certificateSchema.safeParse({ ...certificate, name: "" }).success).toBe(false);
    expect(certificateSchema.safeParse({ ...certificate, document_id: "" }).success).toBe(false);
    expect(certificateSchema.safeParse({ ...certificate, issue_date: "2026-10-23", expiry_date: "2025-10-23" }).success).toBe(false);
  });
  it("requires a replacement note", () => {
    expect(replacementNoteSchema.safeParse(" ").success).toBe(false);
    expect(replacementNoteSchema.safeParse("Received corrected result.").success).toBe(true);
  });
  it("tax and payroll require no dates", () => {
    expect(officeSavePayload("tax_payroll_forms", "", "")).toEqual({ p_check_date: undefined, p_tmu_expiration_date: undefined });
  });
  it("saves source check dates only, never generated expirations", () => {
    for (const key of ["background_check", "adult_maltreatment_check", "child_maltreatment_check"]) {
      expect(officeSavePayload(key, "2026-10-23", "2031-10-23")).toEqual({ p_check_date: "2026-10-23", p_tmu_expiration_date: undefined });
      expect(() => officeSavePayload(key, "", "")).toThrow();
    }
  });
  it("saves both existing TMU dates", () => {
    expect(officeSavePayload("tmu", "2026-10-23", "2027-10-23")).toEqual({ p_check_date: "2026-10-23", p_tmu_expiration_date: "2027-10-23" });
    expect(() => officeSavePayload("tmu", "2026-10-23", "")).toThrow();
  });
  it("office uploads and reads are admin-only and denied to nurses", () => {
    for (const step of ["tax_payroll_forms", "background_check", "adult_maltreatment_check", "child_maltreatment_check", "tmu"]) {
      expect(canUpload(["admin"], false, step, true)).toBe(true);
      expect(canUpload(["caregiver"], true, step, false)).toBe(false);
      expect(canUpload(["admin", "nurse"], false, step, false)).toBe(false);
    }
    expect(canRead(["admin"], false, false)).toBe(true);
    expect(canRead(["caregiver"], true, false)).toBe(false);
    expect(canRead(["nurse"], false, false)).toBe(false);
  });
});