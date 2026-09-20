import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeInServicePeriod,
  computeInServiceStatus,
  isWithin,
  parseDateOnly,
  requiredHoursForPeriod,
  FULL_IN_SERVICE_HOURS,
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
  requiredThisPeriod: number;
  /** Required is between 1 and 11 — the transition (prorated) year. */
  prorated: boolean;
  completedThisPeriod: CompletedSession[];
  completedEarlier: CompletedSession[];
  /** Completed before the program start date — visible but not counted. */
  completedBeforeProgram: CompletedSession[];
}

/** Reads the agency's in-service program start date (Settings). */
export function useInServiceProgramStart() {
  const [programStart, setProgramStart] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("agency_form_defaults")
      .select("id, in_service_program_start_date")
      .limit(1)
      .maybeSingle();
    setRowId((data as any)?.id ?? null);
    setProgramStart(((data as any)?.in_service_program_start_date as string) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { programStart, rowId, loading, reload: load };
}

/**
 * Loads every completed in-service session (session_number 1-12).
 * A session only reaches status "completed" after the caregiver passed the quiz,
 * and the quiz itself is gated behind watching the video, so a completed
 * assignment means both requirements were met.
 */
export function useInServiceCompletions(programStartOverride?: string | null) {
  const [completions, setCompletions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { programStart: loadedStart, loading: startLoading, reload: reloadStart } =
    useInServiceProgramStart();

  const programStartStr =
    programStartOverride !== undefined ? programStartOverride : loadedStart;

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

  const programStartDate = useMemo(
    () => (programStartStr ? parseDateOnly(programStartStr.slice(0, 10)) : null),
    [programStartStr]
  );

  const forCaregiver = useCallback(
    (caregiverId: string, hireDate: string | null | undefined): CaregiverInService => {
      const period = computeInServicePeriod(hireDate);
      const all = byCaregiver.get(caregiverId) ?? [];
      const countable = programStartDate
        ? all.filter((c) => parseDateOnly(c.completed_at.slice(0, 10)) >= programStartDate)
        : all;
      const completedBeforeProgram = programStartDate
        ? all.filter((c) => parseDateOnly(c.completed_at.slice(0, 10)) < programStartDate)
        : [];

      if (!period) {
        return {
          period: null,
          status: "no_hire_date",
          hoursThisPeriod: 0,
          requiredThisPeriod: FULL_IN_SERVICE_HOURS,
          prorated: false,
          completedThisPeriod: [],
          completedEarlier: countable,
          completedBeforeProgram,
        };
      }

      const completedThisPeriod = countable.filter((c) =>
        isWithin(c.completed_at, period.start, period.end)
      );
      const completedEarlier = countable.filter(
        (c) => !isWithin(c.completed_at, period.start, period.end)
      );

      const requiredThisPeriod = requiredHoursForPeriod(
        period.start,
        period.end,
        programStartDate
      );

      const hasPrevious = !!(period.previousStart && period.previousEnd);
      const hoursPreviousPeriod = hasPrevious
        ? countable.filter((c) =>
            isWithin(c.completed_at, period.previousStart!, period.previousEnd!)
          ).length
        : 0;
      const requiredPreviousPeriod = hasPrevious
        ? requiredHoursForPeriod(period.previousStart!, period.previousEnd!, programStartDate)
        : 0;
      const previousGraded =
        hasPrevious && !!programStartDate && period.previousEnd! >= programStartDate;

      return {
        period,
        status: computeInServiceStatus({
          period,
          programStart: programStartDate,
          hoursThisPeriod: completedThisPeriod.length,
          requiredThisPeriod,
          hoursPreviousPeriod,
          requiredPreviousPeriod,
          previousGraded,
        }),
        hoursThisPeriod: completedThisPeriod.length,
        requiredThisPeriod,
        prorated: requiredThisPeriod > 0 && requiredThisPeriod < FULL_IN_SERVICE_HOURS,
        completedThisPeriod,
        completedEarlier,
        completedBeforeProgram,
      };
    },
    [byCaregiver, programStartDate]
  );

  return {
    loading: loading || startLoading,
    completions,
    forCaregiver,
    programStart: programStartStr,
    refetch: async () => {
      await Promise.all([load(), reloadStart()]);
    },
  };
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
