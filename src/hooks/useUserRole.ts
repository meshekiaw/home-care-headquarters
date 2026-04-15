import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<"admin" | "caregiver" | "user" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error || !data || data.length === 0) {
        // No role assigned — deny access by default
        setRole(null);
      } else {
        // Priority: admin > caregiver > user
        const roles = data.map((r) => r.role);
        if (roles.includes("admin")) setRole("admin");
        else if (roles.includes("caregiver")) setRole("caregiver");
        else setRole("user");
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  return { role, isAdmin: role === "admin", isCaregiver: role === "caregiver", loading };
}
