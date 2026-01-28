import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Appointment {
  id: string;
  user_id: string;
  client_id: string;
  caregiver_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: { first_name: string; last_name: string };
  caregiver?: { first_name: string; last_name: string };
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingAppointments: Appointment[];
}

export function useAppointments(selectedDate: Date) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          client:clients(first_name, last_name),
          caregiver:caregivers(first_name, last_name)
        `)
        .gte("start_time", startOfMonth.toISOString())
        .lte("start_time", endOfMonth.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const checkConflicts = async (
    caregiverId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<ConflictInfo> => {
    try {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          client:clients(first_name, last_name),
          caregiver:caregivers(first_name, last_name)
        `)
        .eq("caregiver_id", caregiverId)
        .lt("start_time", endTime.toISOString())
        .gt("end_time", startTime.toISOString());

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        hasConflict: (data?.length || 0) > 0,
        conflictingAppointments: data || [],
      };
    } catch (error) {
      console.error("Error checking conflicts:", error);
      return { hasConflict: false, conflictingAppointments: [] };
    }
  };

  const createAppointment = async (appointment: Omit<Appointment, "id" | "created_at" | "updated_at" | "client" | "caregiver">) => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .insert(appointment)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment created successfully",
      });

      await fetchAppointments();
      return data;
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });

      await fetchAppointments();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment deleted successfully",
      });

      await fetchAppointments();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    appointments,
    loading,
    fetchAppointments,
    checkConflicts,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
}
