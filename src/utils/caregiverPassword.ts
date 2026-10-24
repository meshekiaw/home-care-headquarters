import { z } from "zod";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, passwordProblem } from "../../supabase/functions/caregiver-login-password/rules";

export const caregiverPasswordSchema = z.object({
  password: z.string().min(MIN_PASSWORD_LENGTH, "Use at least 8 characters.")
    .max(MAX_PASSWORD_LENGTH, "Use no more than 128 characters.")
    .refine(value => passwordProblem(value) === null, "Enter a valid password."),
  confirmPassword: z.string(),
  confirmed: z.boolean().refine(value => value, "Confirm that you want to replace the current password."),
}).refine(value => value.password === value.confirmPassword, {
  path: ["confirmPassword"], message: "Passwords do not match.",
});