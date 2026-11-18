import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { QuizResetStatus } from "@/utils/quizReset";

/** Admin-only, server-checked quiz attempt state. Without a caregiver, returns only sessions needing a reset. */
export function useQuizResetStatus(isAdmin: boolean, caregiverId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz-reset-status", user?.id, caregiverId ?? "roster"],
    enabled: isAdmin && !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_quiz_reset_status", caregiverId ? { p_caregiver_id: caregiverId } : {});
      if (error) throw error;
      return (data ?? []) as QuizResetStatus[];
    },
  });
}
