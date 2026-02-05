import { useMemo, useEffect, useRef } from "react";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/hooks/useAppointments";

interface DayViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onTimeSlotClick: (date: Date, hour: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  highlightId?: string | null;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM

export function DayView({
  selectedDate,
  appointments,
  onTimeSlotClick,
  onAppointmentClick,
  highlightId,
}: DayViewProps) {
  const highlightRef = useRef<HTMLDivElement>(null);
  
  // Scroll to highlighted appointment
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);
  const dayAppointments = useMemo(() => {
    const dayKey = format(selectedDate, "yyyy-MM-dd");
    return appointments.filter((apt) => 
      format(new Date(apt.start_time), "yyyy-MM-dd") === dayKey
    );
  }, [appointments, selectedDate]);

  const getAppointmentStyle = (apt: Appointment) => {
    const start = new Date(apt.start_time);
    const end = new Date(apt.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - 6) * 80; // 80px per hour
    const height = (endHour - startHour) * 80;
    return { top: `${top}px`, height: `${Math.max(height, 40)}px` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success/20 border-success text-success-foreground";
      case "scheduled":
        return "bg-primary/20 border-primary text-primary";
      case "in_progress":
        return "bg-warning/20 border-warning text-warning";
      case "completed":
        return "bg-muted border-muted-foreground/30 text-muted-foreground";
      case "cancelled":
        return "bg-destructive/20 border-destructive text-destructive";
      default:
        return "bg-secondary border-border";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden border rounded-lg">
      {/* Header */}
      <div className={cn(
        "p-4 border-b text-center",
        isToday(selectedDate) && "bg-primary/10"
      )}>
        <div className="text-sm text-muted-foreground">{format(selectedDate, "EEEE")}</div>
        <div className={cn(
          "text-2xl font-bold",
          isToday(selectedDate) && "text-primary"
        )}>
          {format(selectedDate, "MMMM d, yyyy")}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {dayAppointments.length} appointment{dayAppointments.length !== 1 ? "s" : ""} scheduled
        </div>
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-[1120px]">
          {/* Time Column */}
          <div className="w-20 shrink-0 border-r bg-secondary/10">
            {HOURS.map((hour) => (
              <div key={hour} className="h-[80px] border-b px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {format(new Date().setHours(hour, 0), "h:mm a")}
                </span>
              </div>
            ))}
          </div>

          {/* Day Column */}
          <div className="flex-1 relative">
            {/* Hour slots */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[80px] border-b hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => onTimeSlotClick(selectedDate, hour)}
              />
            ))}

            {/* Appointments */}
            {dayAppointments.map((apt) => {
              const isHighlighted = apt.id === highlightId;
              return (
                <div
                  key={apt.id}
                  ref={isHighlighted ? highlightRef : undefined}
                  className={cn(
                    "absolute left-2 right-2 rounded-lg border-l-4 p-3 cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:z-10",
                    getStatusColor(apt.status),
                    isHighlighted && "ring-4 ring-primary ring-offset-2 z-20 animate-pulse"
                  )}
                  style={getAppointmentStyle(apt)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAppointmentClick(apt);
                  }}
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{apt.title}</div>
                    <div className="text-sm opacity-75">
                      {format(new Date(apt.start_time), "h:mm a")} - {format(new Date(apt.end_time), "h:mm a")}
                    </div>
                    <div className="text-sm mt-1">
                      <span className="opacity-75">Client: </span>
                      {apt.client?.first_name} {apt.client?.last_name}
                    </div>
                    <div className="text-sm">
                      <span className="opacity-75">Caregiver: </span>
                      {apt.caregiver?.first_name} {apt.caregiver?.last_name}
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium shrink-0 capitalize",
                    apt.status === "confirmed" && "bg-success/30",
                    apt.status === "scheduled" && "bg-primary/30",
                    apt.status === "in_progress" && "bg-warning/30",
                    apt.status === "completed" && "bg-muted",
                    apt.status === "cancelled" && "bg-destructive/30"
                  )}>
                    {apt.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
