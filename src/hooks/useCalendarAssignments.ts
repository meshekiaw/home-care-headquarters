import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CalendarAssignment {
  id: string;
  user_id: string;
  client_id: string;
  caregiver_id: string;
  is_archoices: boolean;
  personal_care_hours: number;
  attendant_care_hours: number;
  standard_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedCalendar {
  id: string;
  assignment_id: string;
  month: number;
  year: number;
  schedule_data: Record<string, { pc: number; ac: number }>;
  total_hours: number;
  generated_at: string;
}

export function useCalendarAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["calendar-assignments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("monthly_calendar_assignments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CalendarAssignment[];
    },
    enabled: !!user,
  });

  const saveAssignment = useMutation({
    mutationFn: async (input: {
      client_id: string;
      caregiver_id: string;
      is_archoices: boolean;
      personal_care_hours: number;
      attendant_care_hours: number;
      standard_hours: number;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if assignment already exists for this client+caregiver
      const { data: existing } = await supabase
        .from("monthly_calendar_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("client_id", input.client_id)
        .eq("caregiver_id", input.caregiver_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("monthly_calendar_assignments")
          .update({
            is_archoices: input.is_archoices,
            personal_care_hours: input.personal_care_hours,
            attendant_care_hours: input.attendant_care_hours,
            standard_hours: input.standard_hours,
            is_active: true,
          })
          .eq("id", existing.id);
        if (error) throw error;
        return existing.id;
      } else {
        const { data, error } = await supabase
          .from("monthly_calendar_assignments")
          .insert({
            user_id: user.id,
            client_id: input.client_id,
            caregiver_id: input.caregiver_id,
            is_archoices: input.is_archoices,
            personal_care_hours: input.personal_care_hours,
            attendant_care_hours: input.attendant_care_hours,
            standard_hours: input.standard_hours,
          })
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] });
      toast.success("Calendar assignment saved! Next month's calendar will be auto-generated.");
    },
    onError: (err) => {
      toast.error("Failed to save assignment: " + (err as Error).message);
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("monthly_calendar_assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] });
      toast.success("Assignment removed");
    },
  });

  const toggleAssignment = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("monthly_calendar_assignments")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-assignments"] });
    },
  });

  const generateNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-monthly-calendars");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generated-calendars"] });
      toast.success(data?.message || "Calendars generated successfully!");
    },
    onError: (err) => {
      toast.error("Failed to generate calendars: " + (err as Error).message);
    },
  });

  return {
    assignments,
    loadingAssignments,
    saveAssignment,
    deleteAssignment,
    toggleAssignment,
    generateNow,
  };
}

export function useGeneratedCalendars(assignmentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["generated-calendars", user?.id, assignmentId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("monthly_calendars")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (assignmentId) {
        query = query.eq("assignment_id", assignmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GeneratedCalendar[];
    },
    enabled: !!user,
  });
}
