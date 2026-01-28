import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/hooks/useAppointments";

interface WeekViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onTimeSlotClick: (date: Date, hour: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM

export function WeekView({
  selectedDate,
  appointments,
  onTimeSlotClick,
  onAppointmentClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const appointmentsByDay = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const dayKey = format(new Date(apt.start_time), "yyyy-MM-dd");
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(apt);
    });
    return grouped;
  }, [appointments]);

  const getAppointmentStyle = (apt: Appointment) => {
    const start = new Date(apt.start_time);
    const end = new Date(apt.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - 6) * 60; // 60px per hour
    const height = (endHour - startHour) * 60;
    return { top: `${top}px`, height: `${Math.max(height, 24)}px` };
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
      <div className="flex border-b bg-secondary/30">
        <div className="w-16 shrink-0 border-r p-2" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex-1 text-center p-2 border-r last:border-r-0",
              isToday(day) && "bg-primary/10"
            )}
          >
            <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
            <div className={cn(
              "text-lg font-semibold",
              isToday(day) && "text-primary"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-[840px]">
          {/* Time Column */}
          <div className="w-16 shrink-0 border-r">
            {HOURS.map((hour) => (
              <div key={hour} className="h-[60px] border-b px-2 py-1">
                <span className="text-xs text-muted-foreground">
                  {format(new Date().setHours(hour, 0), "h a")}
                </span>
              </div>
            ))}
          </div>

          {/* Days */}
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayAppointments = appointmentsByDay[dayKey] || [];

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex-1 border-r last:border-r-0 relative",
                  isToday(day) && "bg-primary/5"
                )}
              >
                {/* Hour slots */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => onTimeSlotClick(day, hour)}
                  />
                ))}

                {/* Appointments */}
                {dayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "absolute left-1 right-1 rounded-md border px-2 py-1 cursor-pointer overflow-hidden text-xs transition-all hover:shadow-md hover:z-10",
                      getStatusColor(apt.status)
                    )}
                    style={getAppointmentStyle(apt)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(apt);
                    }}
                  >
                    <div className="font-medium truncate">{apt.title}</div>
                    <div className="truncate opacity-75">
                      {apt.client?.first_name} {apt.client?.last_name}
                    </div>
                    <div className="truncate opacity-60">
                      {apt.caregiver?.first_name} {apt.caregiver?.last_name}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
