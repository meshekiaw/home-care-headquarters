import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Users, Heart, HandHelping } from "lucide-react";
import { useCaregivers } from "@/hooks/useCaregivers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isWeekend,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Distribute totalHours across days in quarter-hour (.25) increments,
 * summing to exactly totalHours. Extra quarters go to earlier days.
 */
function distributeQuarterHours(totalHours: number, numDays: number): number[] {
  if (numDays === 0) return [];
  const totalQuarters = Math.round(totalHours * 4);
  const baseQ = Math.floor(totalQuarters / numDays);
  const extraDays = totalQuarters % numDays;
  return Array.from({ length: numDays }, (_, i) =>
    (baseQ + (i < extraDays ? 1 : 0)) / 4
  );
}

export default function MonthlyCalendars() {
  const { user } = useAuth();
  const { caregivers } = useCaregivers();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string>("");
  const [isARChoices, setIsARChoices] = useState(true);
  const [personalCareHours, setPersonalCareHours] = useState<number>(64);
  const [attendantCareHours, setAttendantCareHours] = useState<number>(4);
  const [standardHours, setStandardHours] = useState<number>(64);

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

  // ARChoices: PC fills weekdays from the START, AC fills remaining weekdays at the END
  const dailySchedule = useMemo(() => {
    const map = new Map<string, { pc: number; ac: number }>();
    if (weekdays.length === 0) return map;

    if (isARChoices) {
      // Step 1: Distribute PC hours across as many days as needed from the start
      const pcQuarters = Math.round(personalCareHours * 4);
      const pcDaily = distributeQuarterHours(personalCareHours, weekdays.length);
      
      // Find how many full days PC covers — fill from day 0 forward
      // We need to figure out how many days PC actually needs
      // Distribute PC into first N days, then AC into remaining days
      let pcRemaining = pcQuarters;
      const pcPerDay: number[] = [];
      
      // Even distribution across all weekdays for PC, then trim AC days
      // Better approach: figure out max daily PC, fill days until exhausted
      // Use even split: PC across first N days where N = ceil(pcQuarters / maxDailyQuarters)
      // Actually simplest: distribute PC evenly across ALL weekdays from start,
      // then AC evenly across the LAST remaining days that have no PC
      
      // Distribute PC into first pcDayCount days
      // pcDayCount = number of days needed if we distribute evenly
      // We want PC to use as many days as needed from the start
      const pcDailyEven = distributeQuarterHours(personalCareHours, weekdays.length);
      
      // All weekdays get PC hours (distributed from start)
      // AC hours go on the LAST acDayCount days (no PC on those days)
      // So we need to split: first (weekdays.length - acDayCount) days = PC only
      // last acDayCount days = AC only
      
      // How many days does AC need?
      const acQuarters = Math.round(attendantCareHours * 4);
      
      if (acQuarters === 0) {
        // No AC, all days get PC
        const pcDist = distributeQuarterHours(personalCareHours, weekdays.length);
        weekdays.forEach((day, idx) => {
          map.set(format(day, "yyyy-MM-dd"), { pc: pcDist[idx], ac: 0 });
        });
      } else {
        // Figure out how many days AC needs at the end
        // Distribute AC across acDayCount days from the end
        // PC gets the first (total - acDayCount) days
        // We need to find acDayCount such that AC hours fit reasonably
        // Let's compute: distribute AC evenly, find minimum days needed
        // Start with fewest days possible and expand if daily AC > reasonable max
        
        // Simple approach: distribute AC across enough end-days so no day exceeds ~8 hrs
        // But user just wants even distribution, so let's compute:
        // acDayCount where each day gets roughly attendantCareHours/acDayCount
        // We'll distribute across ceil(acQuarters / 32) days minimum (max 8 hrs/day)
        // but at least 1 day
        const maxQuartersPerDay = 32; // 8 hours max per day
        const minAcDays = Math.max(1, Math.ceil(acQuarters / maxQuartersPerDay));
        const acDayCount = Math.min(minAcDays, weekdays.length);
        const pcDayCount = weekdays.length - acDayCount;
        
        if (pcDayCount > 0) {
          const pcDist = distributeQuarterHours(personalCareHours, pcDayCount);
          for (let i = 0; i < pcDayCount; i++) {
            map.set(format(weekdays[i], "yyyy-MM-dd"), { pc: pcDist[i], ac: 0 });
          }
        }
        
        const acDist = distributeQuarterHours(attendantCareHours, acDayCount);
        for (let i = 0; i < acDayCount; i++) {
          map.set(format(weekdays[pcDayCount + i], "yyyy-MM-dd"), { pc: 0, ac: acDist[i] });
        }
      }
    } else {
      const daily = distributeQuarterHours(standardHours, weekdays.length);
      weekdays.forEach((day, idx) => {
        map.set(format(day, "yyyy-MM-dd"), { pc: daily[idx], ac: 0 });
      });
    }
    return map;
  }, [isARChoices, personalCareHours, attendantCareHours, standardHours, weekdays]);

  const totalHours = isARChoices
    ? personalCareHours + attendantCareHours
    : standardHours;

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
          <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label>ARChoices Client</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={isARChoices}
                    onCheckedChange={setIsARChoices}
                  />
                  <span className="text-sm text-muted-foreground">
                    {isARChoices ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Hours configuration */}
            {isARChoices ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                    Personal Care Hours (used first)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={744}
                    value={personalCareHours}
                    onChange={(e) => setPersonalCareHours(Number(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    These hours are distributed and used before attendant care
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <HandHelping className="h-4 w-4 text-blue-500" />
                    Attendant Care Hours (used last)
                  </Label>
                  <Select
                    value={String(attendantCareHours)}
                    onValueChange={(v) => setAttendantCareHours(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 10, 12, 18, 21, 22, 24].map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {h} hours
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Distributed across the last weekdays after PC hours are used
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label>Total Monthly Hours</Label>
                  <Input
                    type="number"
                    min={1}
                    max={744}
                    value={standardHours}
                    onChange={(e) => setStandardHours(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary stats */}
        <div className={`grid gap-4 ${isARChoices ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
          {isARChoices ? (
            <>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Personal Care</p>
                    <p className="text-xl font-bold">{personalCareHours} hrs</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <HandHelping className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendant Care</p>
                    <p className="text-xl font-bold">{attendantCareHours} hrs</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
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
          )}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Combined Total</p>
                <p className="text-xl font-bold">{totalHours} hrs</p>
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

        {/* Legend for ARChoices */}
        {isARChoices && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-500/15 border border-rose-500/30" />
              <span className="text-muted-foreground">Personal Care (used first)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/15 border border-blue-500/30" />
              <span className="text-muted-foreground">Attendant Care (used last)</span>
            </div>
          </div>
        )}

        {/* Calendar grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              {format(currentMonth, "MMMM yyyy")} Schedule
              {isARChoices && (
                <Badge variant="secondary" className="ml-2 text-xs">ARChoices</Badge>
              )}
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

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[100px] p-1.5 transition-colors ${
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
                      const schedule = dailySchedule.get(dayKey);
                      if (!schedule) return null;
                      const { pc, ac } = schedule;

                      if (isARChoices) {
                        return (
                          <div className="space-y-0.5">
                            {pc > 0 && (
                              <div className="rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5">
                                <p className="text-[11px] font-semibold text-rose-600">
                                  PC: {pc} hrs
                                </p>
                              </div>
                            )}
                            {ac > 0 && (
                              <div className="rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5">
                                <p className="text-[11px] font-semibold text-blue-600">
                                  AC: {ac} hrs
                                </p>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {pc + ac} hrs total
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-1">
                          <div className="rounded-md bg-primary/10 border border-primary/20 px-2 py-1">
                            <p className="text-xs font-semibold text-primary">
                              {pc} hrs
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

            {/* Summary footer */}
            <div className="mt-3 text-sm bg-muted/50 rounded-md px-3 py-2 space-y-1">
              {isARChoices ? (() => {
                const acQ = Math.round(attendantCareHours * 4);
                const maxQ = 32;
                const acDays = acQ > 0 ? Math.min(Math.max(1, Math.ceil(acQ / maxQ)), weekdays.length) : 0;
                const pcDays = weekdays.length - acDays;
                return (
                  <>
                    <p className="text-muted-foreground">
                      <strong className="text-rose-600">Personal Care:</strong> {personalCareHours} hrs across first {pcDays} weekdays (used first)
                    </p>
                    {acDays > 0 && (
                      <p className="text-muted-foreground">
                        <strong className="text-blue-600">Attendant Care:</strong> {attendantCareHours} hrs across last {acDays} weekday{acDays > 1 ? "s" : ""} (used last)
                      </p>
                    )}
                    <p className="text-foreground font-medium">
                      Combined Total: {totalHours} hrs/month
                    </p>
                  </>
                );
              })() : (
                <p className="text-muted-foreground">
                  <strong>Total:</strong> {totalHours} hours distributed exactly across {weekdays.length} weekdays.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
