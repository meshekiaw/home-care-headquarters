import { useMemo } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  isSameDay
} from "date-fns";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/hooks/useAppointments";

interface MonthViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function MonthView({
  selectedDate,
  appointments,
  onDayClick,
  onAppointmentClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const appointmentsByDay = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const dayKey = format(new Date(apt.start_time), "yyyy-MM-dd");
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(apt);
    });
    return grouped;
  }, [appointments]);

  const getStatusDot = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success";
      case "scheduled":
        return "bg-primary";
      case "in_progress":
        return "bg-warning";
      case "completed":
        return "bg-muted-foreground";
      case "cancelled":
        return "bg-destructive";
      default:
        return "bg-secondary-foreground";
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 bg-secondary/30">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-b">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayAppointments = appointmentsByDay[dayKey] || [];
          const isCurrentMonth = isSameMonth(day, selectedDate);

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[120px] p-2 border-b border-r cursor-pointer transition-colors hover:bg-secondary/50",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isToday(day) && "bg-primary/5",
                (idx + 1) % 7 === 0 && "border-r-0"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isToday(day) && "text-primary"
              )}>
                {format(day, "d")}
              </div>

              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-1 text-xs p-1 rounded bg-secondary/50 hover:bg-secondary cursor-pointer truncate"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(apt);
                    }}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDot(apt.status))} />
                    <span className="truncate">
                      {format(new Date(apt.start_time), "h:mm")} {apt.title}
                    </span>
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-muted-foreground pl-1">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
