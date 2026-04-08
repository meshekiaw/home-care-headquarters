import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function distributeQuarterHours(totalHours: number, numDays: number): number[] {
  if (numDays === 0) return [];
  const totalQuarters = Math.round(totalHours * 4);
  const baseQ = Math.floor(totalQuarters / numDays);
  const extraDays = totalQuarters % numDays;
  return Array.from({ length: numDays }, (_, i) =>
    (baseQ + (i < extraDays ? 1 : 0)) / 4
  );
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateSchedule(
  year: number,
  month: number,
  isArchoices: boolean,
  pcHours: number,
  acHours: number,
  stdHours: number
): { schedule: Record<string, { pc: number; ac: number }>; totalHours: number } {
  const allDays = getDaysInMonth(year, month);
  const weekdays = allDays.filter((d) => !isWeekend(d));
  const schedule: Record<string, { pc: number; ac: number }> = {};

  if (isArchoices) {
    const acQuarters = Math.round(acHours * 4);
    if (acQuarters === 0) {
      const pcDist = distributeQuarterHours(pcHours, weekdays.length);
      weekdays.forEach((day, idx) => {
        schedule[formatDate(day)] = { pc: pcDist[idx], ac: 0 };
      });
    } else {
      const maxQ = 32;
      const acDayCount = Math.min(Math.max(1, Math.ceil(acQuarters / maxQ)), weekdays.length);
      const pcDayCount = weekdays.length - acDayCount;

      if (pcDayCount > 0) {
        const pcDist = distributeQuarterHours(pcHours, pcDayCount);
        for (let i = 0; i < pcDayCount; i++) {
          schedule[formatDate(weekdays[i])] = { pc: pcDist[i], ac: 0 };
        }
      }
      const acDist = distributeQuarterHours(acHours, acDayCount);
      for (let i = 0; i < acDayCount; i++) {
        schedule[formatDate(weekdays[pcDayCount + i])] = { pc: 0, ac: acDist[i] };
      }
    }
    return { schedule, totalHours: pcHours + acHours };
  } else {
    const daily = distributeQuarterHours(stdHours, weekdays.length);
    weekdays.forEach((day, idx) => {
      schedule[formatDate(day)] = { pc: daily[idx], ac: 0 };
    });
    return { schedule, totalHours: stdHours };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine target month: next month from now
    const now = new Date();
    let targetMonth = now.getMonth() + 2; // getMonth is 0-based, we want next month as 1-based
    let targetYear = now.getFullYear();
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }

    // Get all active assignments
    const { data: assignments, error: assignErr } = await supabase
      .from("monthly_calendar_assignments")
      .select("*")
      .eq("is_active", true);

    if (assignErr) throw assignErr;
    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ message: "No active assignments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;
    for (const a of assignments) {
      // Check if already generated for this month
      const { data: existing } = await supabase
        .from("monthly_calendars")
        .select("id")
        .eq("assignment_id", a.id)
        .eq("month", targetMonth)
        .eq("year", targetYear)
        .maybeSingle();

      if (existing) continue;

      const { schedule, totalHours } = generateSchedule(
        targetYear,
        targetMonth,
        a.is_archoices,
        Number(a.personal_care_hours),
        Number(a.attendant_care_hours),
        Number(a.standard_hours)
      );

      const { error: insertErr } = await supabase
        .from("monthly_calendars")
        .insert({
          user_id: a.user_id,
          assignment_id: a.id,
          month: targetMonth,
          year: targetYear,
          schedule_data: schedule,
          total_hours: totalHours,
        });

      if (insertErr) {
        console.error(`Failed to generate for assignment ${a.id}:`, insertErr);
      } else {
        generated++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Generated ${generated} calendars for ${targetYear}-${targetMonth}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating calendars:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
