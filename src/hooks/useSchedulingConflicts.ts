import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface AvailabilityConflict {
  type: "unavailable" | "outside_hours";
  dayOfWeek: number;
  dayName: string;
  requestedStart: string;
  requestedEnd: string;
  availableSlots: Tables<"caregiver_availability">[];
}

export interface BookingConflict {
  type: "double_booked";
  appointments: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    clientName: string;
  }[];
}

export interface ConflictResult {
  hasConflict: boolean;
  availabilityConflict: AvailabilityConflict | null;
  bookingConflict: BookingConflict | null;
  summary: string[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function checkSchedulingConflicts(
  caregiverId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<ConflictResult> {
  const conflicts: string[] = [];
  let availabilityConflict: AvailabilityConflict | null = null;
  let bookingConflict: BookingConflict | null = null;

  try {
    // Get day of week (0-6, Sunday-Saturday)
    const dayOfWeek = startTime.getDay();
    const requestedStartTime = startTime.toTimeString().slice(0, 5);
    const requestedEndTime = endTime.toTimeString().slice(0, 5);

    // Check 1: Caregiver availability for this day
    const { data: availability } = await supabase
      .from("caregiver_availability")
      .select("*")
      .eq("caregiver_id", caregiverId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_available", true);

    if (!availability || availability.length === 0) {
      // No availability set for this day - caregiver is unavailable
      availabilityConflict = {
        type: "unavailable",
        dayOfWeek,
        dayName: DAY_NAMES[dayOfWeek],
        requestedStart: requestedStartTime,
        requestedEnd: requestedEndTime,
        availableSlots: [],
      };
      conflicts.push(`Caregiver has no availability set for ${DAY_NAMES[dayOfWeek]}`);
    } else {
      // Check if requested time falls within any available slot
      const isWithinAvailability = availability.some((slot) => {
        const slotStart = slot.start_time.slice(0, 5);
        const slotEnd = slot.end_time.slice(0, 5);
        return requestedStartTime >= slotStart && requestedEndTime <= slotEnd;
      });

      if (!isWithinAvailability) {
        availabilityConflict = {
          type: "outside_hours",
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          requestedStart: requestedStartTime,
          requestedEnd: requestedEndTime,
          availableSlots: availability,
        };
        const availableHours = availability
          .map((s) => `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`)
          .join(", ");
        conflicts.push(`Outside caregiver's available hours (${availableHours})`);
      }
    }

    // Check 2: Existing appointments (double-booking)
    let query = supabase
      .from("appointments")
      .select(`
        *,
        client:clients(first_name, last_name)
      `)
      .eq("caregiver_id", caregiverId)
      .neq("status", "cancelled")
      .lt("start_time", endTime.toISOString())
      .gt("end_time", startTime.toISOString());

    if (excludeAppointmentId) {
      query = query.neq("id", excludeAppointmentId);
    }

    const { data: overlappingAppointments } = await query;

    if (overlappingAppointments && overlappingAppointments.length > 0) {
      bookingConflict = {
        type: "double_booked",
        appointments: overlappingAppointments.map((apt) => ({
          id: apt.id,
          title: apt.title,
          startTime: new Date(apt.start_time),
          endTime: new Date(apt.end_time),
          clientName: apt.client
            ? `${apt.client.first_name} ${apt.client.last_name}`
            : "Unknown Client",
        })),
      };
      conflicts.push(
        `Double-booked with ${overlappingAppointments.length} other appointment(s)`
      );
    }

    return {
      hasConflict: conflicts.length > 0,
      availabilityConflict,
      bookingConflict,
      summary: conflicts,
    };
  } catch (error) {
    console.error("Error checking scheduling conflicts:", error);
    return {
      hasConflict: false,
      availabilityConflict: null,
      bookingConflict: null,
      summary: [],
    };
  }
}

export async function getCaregiverAvailability(
  caregiverId: string
): Promise<Tables<"caregiver_availability">[]> {
  try {
    const { data } = await supabase
      .from("caregiver_availability")
      .select("*")
      .eq("caregiver_id", caregiverId)
      .eq("is_available", true)
      .order("day_of_week")
      .order("start_time");

    return data || [];
  } catch (error) {
    console.error("Error fetching caregiver availability:", error);
    return [];
  }
}
