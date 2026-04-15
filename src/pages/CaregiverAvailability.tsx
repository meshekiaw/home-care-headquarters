import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

interface Caregiver {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  phone: string | null;
  email: string | null;
}

interface Availability {
  caregiver_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}${ampm}`;
}

export default function CaregiverAvailability() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: cgs } = await supabase
        .from("caregivers")
        .select("id, first_name, last_name, status, phone, email")
        .order("first_name");

      if (cgs && cgs.length > 0) {
        setCaregivers(cgs);
        const ids = cgs.map((c) => c.id);
        const { data: avail } = await supabase
          .from("caregiver_availability")
          .select("caregiver_id, day_of_week, start_time, end_time, is_available")
          .in("caregiver_id", ids);
        if (avail) setAvailability(avail);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = caregivers.filter((c) =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const getSlots = (caregiverId: string) =>
    availability.filter((a) => a.caregiver_id === caregiverId && a.is_available);

  const isSlotActive = (slots: Availability[], day: number, hour: number) =>
    slots.some(
      (s) => s.day_of_week === day && parseTime(s.start_time) <= hour && parseTime(s.end_time) > hour
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Caregiver Availability</h1>
            <p className="text-muted-foreground text-sm">
              Overview of all caregiver weekly schedules
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search caregivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Clock className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Loading availability...</span>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No caregivers found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((cg) => {
              const slots = getSlots(cg.id);
              return (
                <Card key={cg.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/caregivers/${cg.id}`}
                          className="hover:underline"
                        >
                          <CardTitle className="text-base">
                            {cg.first_name} {cg.last_name}
                          </CardTitle>
                        </Link>
                        <Badge
                          variant={cg.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {cg.status}
                        </Badge>
                      </div>
                      {cg.phone && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {cg.phone}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No availability set.{" "}
                        <Link
                          to={`/caregivers/${cg.id}`}
                          className="text-primary hover:underline"
                        >
                          Configure →
                        </Link>
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[500px]">
                          {/* Header row */}
                          <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-px mb-1">
                            <div />
                            {DAYS.map((d) => (
                              <div
                                key={d}
                                className="text-center text-xs font-medium text-muted-foreground"
                              >
                                {d}
                              </div>
                            ))}
                          </div>
                          {/* Hour rows */}
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="grid grid-cols-[50px_repeat(7,1fr)] gap-px"
                            >
                              <div className="text-[10px] text-muted-foreground text-right pr-2 leading-5">
                                {formatHour(hour)}
                              </div>
                              {DAYS.map((_, dayIdx) => (
                                <div
                                  key={dayIdx}
                                  className={cn(
                                    "h-5 rounded-sm transition-colors",
                                    isSlotActive(slots, dayIdx, hour)
                                      ? "bg-primary/70"
                                      : "bg-muted/40"
                                  )}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
