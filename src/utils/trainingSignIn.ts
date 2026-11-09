import { supabase } from "@/integrations/supabase/client";

const NOT_FOUND = "We couldn't find that email. Please call the office so we can update the email we have on file.";
const BUSY = "A lot of people are signing in right now. Please wait a few minutes and try again.";
const UNAVAILABLE = "We couldn't send your sign-in link right now. Please try again, or call the office if it keeps happening.";

export function trainingSignInError(value: unknown): string {
  if (!value || typeof value !== "object") return UNAVAILABLE;
  const error = value as { code?: string; status?: number; message?: string };
  if (error.code === "not_found") return NOT_FOUND;
  if (error.code === "office_update") return "We found your record, but your sign-in needs an update from the office. Please call the office.";
  if (error.status === 429 || error.code === "email_rate_limit" || /rate.?limit|too many requests/i.test(error.message ?? "")) return BUSY;
  return UNAVAILABLE;
}

export async function requestTrainingLink(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("caregiver-training-sign-in", { body: { email } });
    if (error) {
      if (error.context instanceof Response) {
        try { return trainingSignInError(await error.context.json()); } catch { return trainingSignInError({ status: error.context.status }); }
      }
      return trainingSignInError(error);
    }
    return data?.success === true ? null : trainingSignInError(data);
  } catch {
    return UNAVAILABLE;
  }
}