import { z } from "zod";
import { isDateOnlyString } from "./dateOnly";

const date = z.string().refine(isDateOnlyString, "Enter a valid date.");
const optionalDate = z.union([z.literal(""), date]);
export const reviewSchema = z.object({
  action: z.enum(["approve", "send_back", "paper_approve"]),
  note: z.string().trim().max(2000),
  originalSeen: z.boolean(),
  originalDate: optionalDate,
}).superRefine((v, ctx) => {
  if (v.action !== "approve" && !v.note) ctx.addIssue({ code: "custom", path: ["note"], message: "Enter a reason or received-paperwork note." });
  if (v.originalSeen && !v.originalDate) ctx.addIssue({ code: "custom", path: ["originalDate"], message: "Enter the date the original was seen." });
});
export const certificateSchema = z.object({
  name: z.string().trim().min(1, "Enter the certificate name.").max(150),
  number: z.string().trim().max(150), issue_date: optionalDate, expiry_date: optionalDate,
  document_id: z.string().uuid("Choose an uploaded certificate."),
}).refine(v => !v.issue_date || !v.expiry_date || v.expiry_date >= v.issue_date, "Expiration cannot be before issue date.");
export const replacementNoteSchema = z.string().trim().min(1, "Enter a replacement note.").max(2000);
export function canReviewStep(step: number) { return step >= 1 && step <= 6; }
export function officeSavePayload(step: string, checkDate: string, tmuExpiration: string) {
  if (!["tax_payroll_forms", "background_check", "adult_maltreatment_check", "child_maltreatment_check", "tmu"].includes(step)) throw new Error("Choose an office step.");
  if (step !== "tax_payroll_forms" && !isDateOnlyString(checkDate)) throw new Error("Enter the check date.");
  if (step === "tmu" && (!isDateOnlyString(tmuExpiration) || tmuExpiration < checkDate)) throw new Error("Enter a TMU expiration on or after its date.");
  return { p_check_date: step === "tax_payroll_forms" ? undefined : checkDate, p_tmu_expiration_date: step === "tmu" ? tmuExpiration : undefined };
}
export const onboardingStatus = {
  not_started: { label: "Not started", variant: "onboardingIdle" },
  submitted: { label: "Submitted", variant: "onboardingSubmitted" },
  approved: { label: "Approved", variant: "onboardingApproved" },
  sent_back: { label: "Sent back", variant: "onboardingSentBack" },
  not_applicable: { label: "Not applicable", variant: "onboardingIdle" },
} as const;