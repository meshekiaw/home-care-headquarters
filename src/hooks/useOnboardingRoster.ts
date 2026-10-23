import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RosterStep } from "@/utils/caregiverOnboarding";

/** Admin view: active onboarding steps grouped by caregiver id. File data is never read. */
export function useOnboardingRoster(enabled = true) {
  return useQuery({
    queryKey: ["onboarding-roster"],
    enabled,
    queryFn: async () => {
      const { data: onboardings, error } = await supabase.from("caregiver_onboarding")
        .select("id,caregiver_id").is("archived_at", null);
      if (error) throw error;
      const byOnboarding = new Map((onboardings ?? []).map((o) => [o.id, o.caregiver_id]));
      const result = new Map<string, RosterStep[]>();
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data, error: e } = await supabase.from("caregiver_onboarding_steps")
          .select("id,onboarding_id,step_number,status,submitted_at,approved_at,updated_at")
          .order("id").range(from, from + page - 1);
        if (e) throw e;
        for (const s of data ?? []) {
          const cg = byOnboarding.get(s.onboarding_id);
          if (!cg) continue;
          if (!result.has(cg)) result.set(cg, []);
          result.get(cg)!.push(s);
        }
        if (!data || data.length < page) break;
      }
      return result;
    },
  });
}
