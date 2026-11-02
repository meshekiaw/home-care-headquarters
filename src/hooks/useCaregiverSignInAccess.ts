import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CaregiverAccess } from "@/utils/caregiverSignInAccess";

export function useCaregiverSignInAccess(isAdmin: boolean, caregiverId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["caregiver-sign-in-access", user?.id, caregiverId ?? "roster"],
    enabled: isAdmin && !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_caregiver_access", { p_caregiver_id: caregiverId ?? null });
      if (error) throw error;
      return (Array.isArray(data) ? data : [data]) as unknown as CaregiverAccess[];
    },
  });
}