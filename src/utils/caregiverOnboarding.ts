import { z } from "zod";

export const VISIBLE_ONBOARDING_STEPS = [1, 2, 3, 4, 5, 6, 12] as const;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_STEP_FILES = 2;
export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,application/pdf,image/jpeg,image/png,image/heic";

export function onboardingProgress(steps: { step_number: number; status: string }[]) {
  return steps.filter((s) => VISIBLE_ONBOARDING_STEPS.some((n) => n === s.step_number)
    && ["approved", "not_applicable"].includes(s.status)).length;
}

export function documentValidation(file: { name: string; size: number; type: string }, activeCount: number): string | null {
  if (activeCount >= MAX_STEP_FILES) return "A step can have up to two files. Remove a file before adding another.";
  if (!file.size || file.size > MAX_DOCUMENT_BYTES) return "Choose a file up to 10 MB.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const types: Record<string, string[]> = { pdf: ["application/pdf"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"], heic: ["image/heic", "image/heif"] };
  if (!extension || !types[extension] || (file.type && file.type !== "application/octet-stream" && !types[extension].includes(file.type))) {
    return "Choose a PDF, JPG, PNG, or HEIC file.";
  }
  return null;
}

const phone = z.string().trim().max(30).regex(/^[+()\d .-]+$/, "Enter a valid phone number.")
  .refine((value) => value.replace(/\D/g, "").length >= 10 && value.replace(/\D/g, "").length <= 15, "Enter a valid phone number.");
export const contactSchema = z.object({
  address: z.string().trim().min(1, "Enter your address.").max(200),
  city: z.string().trim().min(1, "Enter your city.").max(100),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, "Enter a two-letter state.").transform((v) => v.toUpperCase()),
  zip_code: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code."),
  phone,
  emergency_contact_name: z.string().trim().min(1, "Enter an emergency contact name.").max(100),
  emergency_contact_relationship: z.string().trim().min(1, "Enter the relationship.").max(100),
  emergency_contact_phone: phone,
}).strict();
export type OnboardingContact = z.infer<typeof contactSchema>;