import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeInServicePeriod,
  computeInServiceStatus,
  isWithin,
  type InServicePeriod,
  type InServiceStatus,
} from "@/utils/inServiceStatus";

export interface CompletedSession {
  caregiver_id: string;
  session_number: number;
  session_title: string;
  completed_at: string;
}

export interface CaregiverInService {
  period: InServicePeriod | null;
  status: InServiceStatus;
  hoursThisPeriod: number;
  completedThisPeriod: CompletedSession[];
  completedEarlier: CompletedSession[];
}

/**
 * Loads every completed in-service session (session_number 1-12).
 * A session only reaches status "completed" after the caregiver passed the quiz,
 * and the quiz itself is gated behind watching the video, so a completed
 * assignment means both requirements were met.
 */
export function useInServiceCompletions() {
  const [completions, setCompletions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lms_assignments")
      .select("caregiver_id, completed_at, status, lms_courses!inner(session_number, title)")
      .eq("status", "completed")
      .not("lms_courses.session_number", "is", null);
    const rows: CompletedSession[] = ((data as any[]) || [])
      .filter((a) => a.caregiver_id && a.completed_at)
      .map((a) => ({
        caregiver_id: a.caregiver_id as string,
        session_number: a.lms_courses.session_number as number,
        session_title: a.lms_courses.title as string,
        completed_at: a.completed_at as string,
      }));
    setCompletions(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byCaregiver = useMemo(() => {
    const m = new Map<string, CompletedSession[]>();
    completions.forEach((c) => {
      const list = m.get(c.caregiver_id) ?? [];
      list.push(c);
      m.set(c.caregiver_id, list);
    });
    return m;
  }, [completions]);

  const forCaregiver = useCallback(
    (caregiverId: string, hireDate: string | null | undefined): CaregiverInService => {
      const period = computeInServicePeriod(hireDate);
      const all = byCaregiver.get(caregiverId) ?? [];
      if (!period) {
        return {
          period: null,
          status: "no_hire_date",
          hoursThisPeriod: 0,
          completedThisPeriod: [],
          completedEarlier: all,
        };
      }
      const completedThisPeriod = all.filter((c) =>
        isWithin(c.completed_at, period.start, period.end)
      );
      const completedEarlier = all.filter(
        (c) => !isWithin(c.completed_at, period.start, period.end)
      );
      const previousHours =
        period.previousStart && period.previousEnd
          ? all.filter((c) => isWithin(c.completed_at, period.previousStart!, period.previousEnd!))
              .length
          : 0;
      return {
        period,
        status: computeInServiceStatus(period, completedThisPeriod.length, previousHours),
        hoursThisPeriod: completedThisPeriod.length,
        completedThisPeriod,
        completedEarlier,
      };
    },
    [byCaregiver]
  );

  return { loading, completions, forCaregiver, refetch: load };
}

export function useInServiceSessionList() {
  const [sessions, setSessions] = useState<{ session_number: number; title: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lms_courses")
        .select("session_number, title")
        .not("session_number", "is", null)
        .order("session_number", { ascending: true });
      setSessions(
        ((data as any[]) || []).map((c) => ({
          session_number: c.session_number as number,
          title: c.title as string,
        }))
      );
    })();
  }, []);

  return sessions;
}
