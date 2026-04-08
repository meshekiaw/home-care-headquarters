import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isWeekend,
  isSameMonth,
  format,
  addMonths,
} from "date-fns";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface UpcomingCalendarTabProps {
  caregiverId: string;
  caregiverName: string;
}

export default function UpcomingCalendarTab({ caregiverId, caregiverName }: UpcomingCalendarTabProps) {
  const { user } = useAuth();

  // Fetch assignments for this caregiver
  const { data: assignments = [] } = useQuery({
    queryKey: ["caregiver-calendar-assignments", user?.id, caregiverId],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("monthly_calendar_assignments")
        .select("*, clients(first_name, last_name)")
        .eq("user_id", user.id)
        .eq("caregiver_id", caregiverId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch generated calendars for this caregiver's assignments
  const assignmentIds = assignments.map((a: any) => a.id);
  const { data: calendars = [] } = useQuery({
    queryKey: ["caregiver-generated-calendars", user?.id, assignmentIds],
    queryFn: async () => {
      if (!user || assignmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("monthly_calendars")
        .select("*")
        .eq("user_id", user.id)
        .in("assignment_id", assignmentIds)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user && assignmentIds.length > 0,
  });

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No active calendar assignments for this caregiver.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Go to Monthly Calendars to create an assignment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Assignments Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assignments.map((a: any) => {
              const client = a.clients;
              return (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">
                      {client ? `${client.first_name} ${client.last_name}` : "Unknown Client"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.is_archoices
                        ? `PC: ${a.personal_care_hours} hrs / AC: ${a.attendant_care_hours} hrs`
                        : `${a.standard_hours} hrs/month`}
                    </p>
                  </div>
                  <Badge variant={a.is_archoices ? "default" : "secondary"}>
                    {a.is_archoices ? "ARChoices" : "Standard"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Generated Calendars */}
      {calendars.map((cal: any) => {
        const assignment = assignments.find((a: any) => a.id === cal.assignment_id);
        const client = assignment?.clients;
        const clientName = client ? `${client.first_name} ${client.last_name}` : "Unknown";
        const monthDate = new Date(cal.year, cal.month - 1);
        const monthLabel = format(monthDate, "MMMM yyyy");
        const schedule: Record<string, { pc: number; ac: number }> = cal.schedule_data || {};

        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const calStart = startOfWeek(monthStart);
        const calEnd = endOfWeek(monthEnd);
        const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

        return (
          <Card key={cal.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {monthLabel} — {clientName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
                {allDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const entry = schedule[key];
                  const inMonth = isSameMonth(day, monthDate);
                  const weekend = isWeekend(day);

                  return (
                    <div
                      key={key}
                      className={`min-h-[56px] rounded-md border p-1 text-xs ${
                        !inMonth
                          ? "opacity-30"
                          : weekend
                          ? "bg-muted/30"
                          : "bg-background"
                      }`}
                    >
                      <div className="font-medium text-[10px] text-muted-foreground">
                        {day.getDate()}
                      </div>
                      {inMonth && weekend && (
                        <span className="text-[10px] text-muted-foreground">Off</span>
                      )}
                      {entry && entry.pc > 0 && (
                        <div className="bg-pink-100 text-pink-700 rounded px-0.5 text-[10px] truncate">
                          PC: {entry.pc}
                        </div>
                      )}
                      {entry && entry.ac > 0 && (
                        <div className="bg-blue-100 text-blue-700 rounded px-0.5 text-[10px] truncate">
                          AC: {entry.ac}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-pink-100 border border-pink-200" /> Personal Care
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> Attendant Care
                </span>
                <span className="ml-auto font-medium">{cal.total_hours} hrs total</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {calendars.length === 0 && assignments.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No calendars generated yet. Use "Generate Next Month Now" on the Monthly Calendars page.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
