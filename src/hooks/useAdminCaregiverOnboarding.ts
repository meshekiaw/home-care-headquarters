import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { caregiverDocumentRequest, type OnboardingDocument } from "./useCaregiverOnboarding";

const stepSchema = z.object({
  id: z.string(), step_number: z.number(), step_key: z.string(), step_label: z.string(), status: z.string(),
  submitted_at: z.string().nullable(), approved_at: z.string().nullable(), approved_by_name: z.string().nullable(),
  sent_back_reason: z.string().nullable(), certificate_name: z.string().nullable(), no_certificate: z.boolean(),
  admin_note: z.string().nullable(), original_seen_date: z.string().nullable(),
});
const dataSchema = z.object({ id: z.string(), steps: z.array(stepSchema), history: z.array(z.object({
  id: z.string(), step_id: z.string().nullable(), old_status: z.string().nullable(), new_status: z.string().nullable(),
  changed_at: z.string(), actor_name: z.string(), note: z.string().nullable(), event_type: z.string(),
})) });
export type AdminOnboardingStep = Required<z.infer<typeof stepSchema>>;
type AdminOnboardingData = { id: string; steps: AdminOnboardingStep[]; history: Required<z.infer<typeof dataSchema>["history"][number]>[] };
export function useAdminCaregiverOnboarding(caregiverId: string, enabled: boolean) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-caregiver-onboarding", caregiverId], enabled,
    queryFn: async () => {
      const [record, files] = await Promise.all([
        supabase.rpc("admin_caregiver_onboarding", { p_caregiver_id: caregiverId }),
        caregiverDocumentRequest<{ documents: OnboardingDocument[] }>({ action: "list", caregiver_id: caregiverId }),
      ]);
      if (record.error) throw record.error;
      if (!record.data) return null;
      const validated = dataSchema.parse(record.data) as AdminOnboardingData;
      return { ...validated, documents: files.documents };
    },
  });
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ["admin-caregiver-onboarding", caregiverId] }),
    client.invalidateQueries({ queryKey: ["caregiver-onboarding", caregiverId] }),
    client.invalidateQueries({ queryKey: ["onboarding-roster"] }),
    client.invalidateQueries({ queryKey: ["portal-caregiver"] }),
  ]);
  return { ...query, refresh };
}