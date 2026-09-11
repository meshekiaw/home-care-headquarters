import { supabase } from "@/integrations/supabase/client";

/**
 * A nurse has history when assessments or handoffs reference them.
 * Records with history must be deactivated instead of deleted.
 */
export async function nurseHistoryCounts(ids: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (ids.length === 0) return counts;

  const checks: Array<[string, string]> = [
    ["nurse_assessments", "assigned_nurse_id"],
    ["client_assessments", "assigned_nurse_id"],
    ["assessment_handoffs", "released_by_nurse_id"],
    ["assessment_handoffs", "picked_up_by_nurse_id"],
  ];

  for (const [table, column] of checks) {
    const { data } = await supabase.from(table as any).select(column).in(column, ids);
    for (const row of (data as any[]) ?? []) {
      const id = row[column];
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}
