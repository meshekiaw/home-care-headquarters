import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, endOfWeek, format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export interface ConflictItem {
  id: string;
  type: "double_booking" | "outside_availability" | "no_availability";
  severity: "error" | "warning";
  caregiverId: string;
  caregiverName: string;
  appointmentId: string;
  appointmentTitle: string;
  clientName: string;
  date: Date;
  startTime: string;
  endTime: string;
  message: string;
  conflictingAppointment?: {
    id: string;
    title: string;
    clientName: string;
    startTime: string;
    endTime: string;
  };
}

interface AppointmentWithRelations {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  caregiver_id: string;
  caregiver: { id: string; first_name: string; last_name: string } | null;
  client: { id: string; first_name: string; last_name: string } | null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function useWeeklyConflicts(weekDate: Date) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchConflicts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const foundConflicts: ConflictItem[] = [];

    try {
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 0 });

      // Fetch all appointments for the week
      const { data: appointments } = await supabase
        .from("appointments")
        .select(`
          id,
          title,
          start_time,
          end_time,
          status,
          caregiver_id,
          caregiver:caregivers(id, first_name, last_name),
          client:clients(id, first_name, last_name)
        `)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .neq("status", "cancelled")
        .order("start_time");

      if (!appointments || appointments.length === 0) {
        setConflicts([]);
        setLoading(false);
        return;
      }

      // Get unique caregiver IDs
      const caregiverIds = [...new Set(appointments.map((a) => a.caregiver_id))];

      // Fetch all availability for these caregivers
      const { data: allAvailability } = await supabase
        .from("caregiver_availability")
        .select("*")
        .in("caregiver_id", caregiverIds)
        .eq("is_available", true);

      // Group availability by caregiver
      const availabilityByCaregiver = new Map<string, Tables<"caregiver_availability">[]>();
      allAvailability?.forEach((slot) => {
        const existing = availabilityByCaregiver.get(slot.caregiver_id) || [];
        existing.push(slot);
        availabilityByCaregiver.set(slot.caregiver_id, existing);
      });

      // Check each appointment for conflicts
      for (let i = 0; i < appointments.length; i++) {
        const apt = appointments[i] as AppointmentWithRelations;
        const startTime = new Date(apt.start_time);
        const endTime = new Date(apt.end_time);
        const dayOfWeek = startTime.getDay();
        const requestedStartTime = format(startTime, "HH:mm");
        const requestedEndTime = format(endTime, "HH:mm");

        const caregiverName = apt.caregiver
          ? `${apt.caregiver.first_name} ${apt.caregiver.last_name}`
          : "Unknown";
        const clientName = apt.client
          ? `${apt.client.first_name} ${apt.client.last_name}`
          : "Unknown";

        // Check availability conflicts
        const caregiverAvailability = availabilityByCaregiver.get(apt.caregiver_id) || [];
        const dayAvailability = caregiverAvailability.filter((a) => a.day_of_week === dayOfWeek);

        if (dayAvailability.length === 0) {
          // No availability for this day
          foundConflicts.push({
            id: `no-avail-${apt.id}`,
            type: "no_availability",
            severity: "warning",
            caregiverId: apt.caregiver_id,
            caregiverName,
            appointmentId: apt.id,
            appointmentTitle: apt.title,
            clientName,
            date: startTime,
            startTime: requestedStartTime,
            endTime: requestedEndTime,
            message: `${caregiverName} has no availability set for ${DAY_NAMES[dayOfWeek]}`,
          });
        } else {
          // Check if appointment falls within available hours
          const isWithinAvailability = dayAvailability.some((slot) => {
            const slotStart = slot.start_time.slice(0, 5);
            const slotEnd = slot.end_time.slice(0, 5);
            return requestedStartTime >= slotStart && requestedEndTime <= slotEnd;
          });

          if (!isWithinAvailability) {
            const availableHours = dayAvailability
              .map((s) => `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`)
              .join(", ");

            foundConflicts.push({
              id: `outside-${apt.id}`,
              type: "outside_availability",
              severity: "warning",
              caregiverId: apt.caregiver_id,
              caregiverName,
              appointmentId: apt.id,
              appointmentTitle: apt.title,
              clientName,
              date: startTime,
              startTime: requestedStartTime,
              endTime: requestedEndTime,
              message: `Scheduled outside ${caregiverName}'s hours (available: ${availableHours})`,
            });
          }
        }

        // Check for double-bookings with other appointments
        for (let j = i + 1; j < appointments.length; j++) {
          const otherApt = appointments[j] as AppointmentWithRelations;

          // Same caregiver check
          if (apt.caregiver_id !== otherApt.caregiver_id) continue;

          const otherStart = new Date(otherApt.start_time);
          const otherEnd = new Date(otherApt.end_time);

          // Check if times overlap
          if (startTime < otherEnd && endTime > otherStart) {
            const otherClientName = otherApt.client
              ? `${otherApt.client.first_name} ${otherApt.client.last_name}`
              : "Unknown";

            foundConflicts.push({
              id: `double-${apt.id}-${otherApt.id}`,
              type: "double_booking",
              severity: "error",
              caregiverId: apt.caregiver_id,
              caregiverName,
              appointmentId: apt.id,
              appointmentTitle: apt.title,
              clientName,
              date: startTime,
              startTime: requestedStartTime,
              endTime: requestedEndTime,
              message: `${caregiverName} is double-booked`,
              conflictingAppointment: {
                id: otherApt.id,
                title: otherApt.title,
                clientName: otherClientName,
                startTime: format(otherStart, "HH:mm"),
                endTime: format(otherEnd, "HH:mm"),
              },
            });
          }
        }
      }

      // Sort conflicts: errors first, then by date
      foundConflicts.sort((a, b) => {
        if (a.severity !== b.severity) {
          return a.severity === "error" ? -1 : 1;
        }
        return a.date.getTime() - b.date.getTime();
      });

      setConflicts(foundConflicts);
    } catch (error) {
      console.error("Error fetching weekly conflicts:", error);
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, [user, weekDate]);

  return {
    conflicts,
    loading,
    refetch: fetchConflicts,
    errorCount: conflicts.filter((c) => c.severity === "error").length,
    warningCount: conflicts.filter((c) => c.severity === "warning").length,
  };
}
