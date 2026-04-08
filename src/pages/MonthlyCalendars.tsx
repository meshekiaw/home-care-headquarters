import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Users } from "lucide-react";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isWeekend,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthlyCalendars() {
  const { user } = useAuth();
  const { caregivers } = useCaregivers();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string>("");
  const [totalHours, setTotalHours] = useState<number>(64);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const weekdays = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
      (day) => !isWeekend(day)
    );
  }, [monthStart.getTime(), monthEnd.getTime()]);

  // Distribute hours exactly: no rounding, total always equals totalHours
  const dailyHoursMap = useMemo(() => {
    const map = new Map<string, number>();
    if (weekdays.length === 0) return map;
    const baseHours = Math.floor((totalHours * 100) / weekdays.length) / 100;
    const totalBase = Math.round(baseHours * weekdays.length * 100) / 100;
    const remainder = Math.round((totalHours - totalBase) * 100) / 100;
    // Convert remainder to cents to distribute 1 cent at a time
    const extraCents = Math.round(remainder * 100);
    weekdays.forEach((day, idx) => {
      const extra = idx < extraCents ? 0.01 : 0;
      const hrs = Math.round((baseHours + extra) * 100) / 100;
      map.set(format(day, "yyyy-MM-dd"), hrs);
    });
    return map;
  }, [totalHours, weekdays]);

  const baseHoursPerDay = weekdays.length > 0
    ? Math.floor((totalHours * 100) / weekdays.length) / 100
    : 0;

  // Build calendar grid (6 weeks max)
  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthStart.getTime(), monthEnd.getTime()]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedCaregiver = caregivers.find((c) => c.id === selectedCaregiverId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Monthly Calendars</h2>
          <p className="text-muted-foreground">
            Generate monthly schedules with evenly distributed hours
          </p>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Caregiver</Label>
                <Select value={selectedCaregiverId} onValueChange={setSelectedCaregiverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select caregiver" />
                  </SelectTrigger>
                  <SelectContent>
                    {caregivers.map((cg) => (
                      <SelectItem key={cg.id} value={cg.id}>
                        {cg.first_name} {cg.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Total Monthly Hours</Label>
                <Input
                  type="number"
                  min={1}
                  max={744}
                  value={totalHours}
                  onChange={(e) => setTotalHours(Number(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center font-medium text-sm border rounded-md h-10 flex items-center justify-center bg-background">
                    {format(currentMonth, "MMMM yyyy")}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl font-bold">{totalHours}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weekdays</p>
                <p className="text-xl font-bold">{weekdays.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hours/Day</p>
                <p className="text-xl font-bold">~{baseHoursPerDay}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assignment</p>
                <p className="text-sm font-medium truncate max-w-[120px]">
                  {selectedClient
                    ? `${selectedClient.first_name} ${selectedClient.last_name}`
                    : "No client"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              {format(currentMonth, "MMMM yyyy")} Schedule
            </CardTitle>
            {selectedCaregiver && (
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {selectedCaregiver.first_name} {selectedCaregiver.last_name}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="bg-muted px-2 py-2 text-center text-xs font-semibold text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, currentMonth);
                const weekend = isWeekend(day);
                const isWorkday = inMonth && !weekend;
                const dayNum = getDay(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[90px] p-2 transition-colors ${
                      !inMonth
                        ? "bg-muted/30"
                        : weekend
                        ? "bg-muted/50"
                        : "bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          !inMonth
                            ? "text-muted-foreground/40"
                            : weekend
                            ? "text-muted-foreground/60"
                            : "text-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    {isWorkday && (() => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayHours = dailyHoursMap.get(dayKey) || 0;
                      return (
                      <div className="space-y-1">
                        <div className="rounded-md bg-primary/10 border border-primary/20 px-2 py-1">
                          <p className="text-xs font-semibold text-primary">
                            {dayHours} hrs
                          </p>
                          </p>
                          {selectedClient && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {selectedClient.first_name} {selectedClient.last_name}
                            </p>
                          )}
                        </div>
                      </div>
                      );
                    })()}
                    {weekend && inMonth && (
                      <p className="text-[10px] text-muted-foreground/50 italic">
                        Off
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Exact distribution confirmation */}
            <div className="mt-3 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <strong>Total:</strong> {totalHours} hours distributed exactly across {weekdays.length} weekdays.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
