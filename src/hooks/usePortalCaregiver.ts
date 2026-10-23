import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function usePortalCaregiver() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portal-caregiver", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("caregivers")
        .select("id,first_name,last_name,onboarding_required,status,address,city,state,zip_code,phone,emergency_contact_name,emergency_contact_relationship,emergency_contact_phone")
        .eq("auth_user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}