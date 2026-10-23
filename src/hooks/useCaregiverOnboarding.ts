import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VISIBLE_ONBOARDING_STEPS } from "@/utils/caregiverOnboarding";

export interface OnboardingDocument {
  id: string;
  step_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}

export async function caregiverDocumentRequest<T>(body: object | FormData): Promise<T> {
  const { data, error } = await supabase.functions.invoke("caregiver-documents", { body });
  if (error) {
    if ("context" in error && error.context instanceof Response) {
      const response = await error.context.clone().json().catch(() => null);
      // The gateway returns deliberately plain, non-sensitive errors.
      if (typeof response?.error === "string") throw new Error(response.error);
    }
    throw new Error("The file request could not be completed. Please try again.");
  }
  return data as T;
}

export function useCaregiverOnboarding(caregiverId: string | undefined, enabled: boolean) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["caregiver-onboarding", caregiverId],
    enabled: enabled && Boolean(caregiverId),
    queryFn: async () => {
      if (!caregiverId) return null;
      const { error: syncError } = await supabase.rpc("refresh_my_onboarding_receipts");
      if (syncError) throw syncError;
      const { data: onboarding, error } = await supabase.from("caregiver_onboarding")
        .select("id").eq("caregiver_id", caregiverId).is("archived_at", null).maybeSingle();
      if (error) throw error;
      if (!onboarding) return null;
      const [steps, policies, acknowledgments, documents] = await Promise.all([
        supabase.from("caregiver_onboarding_steps")
          .select("id,step_number,step_key,step_label,status,sent_back_reason,no_certificate,certificate_name,submitted_at,approved_at")
          .eq("onboarding_id", onboarding.id).in("step_number", [...VISIBLE_ONBOARDING_STEPS]).order("step_number"),
        supabase.from("lms_policies").select("id,title,content,version,effective_date").eq("is_active", true).order("title"),
        supabase.from("lms_policy_acknowledgments").select("policy_id").eq("caregiver_id", caregiverId),
        caregiverDocumentRequest<{ documents: OnboardingDocument[] }>({ action: "list", caregiver_id: caregiverId }),
      ]);
      if (steps.error) throw steps.error;
      if (policies.error) throw policies.error;
      if (acknowledgments.error) throw acknowledgments.error;
      const visibleIds = new Set((steps.data ?? []).map((s) => s.id));
      return {
        steps: steps.data ?? [], policies: policies.data ?? [],
        acknowledgedIds: (acknowledgments.data ?? []).map((a) => a.policy_id),
        documents: documents.documents.filter((d) => visibleIds.has(d.step_id)),
      };
    },
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["caregiver-onboarding", caregiverId] }),
      client.invalidateQueries({ queryKey: ["portal-caregiver"] }),
    ]);
  };
  return { ...query, refresh };
}