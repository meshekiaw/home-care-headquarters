import { supabase } from "@/integrations/supabase/client";

/**
 * Delete nurses and their dependent records so no orphaned data or
 * foreign-key errors are left behind.
 */
export async function deleteNurses(ids: string[]) {
  if (ids.length === 0) return;

  // Unassign assessments so history stays intact
  const { error: assessErr } = await supabase
    .from("client_assessments")
    .update({ assigned_nurse_id: null })
    .in("assigned_nurse_id", ids);
  if (assessErr) throw assessErr;

  const { error: pickupErr } = await supabase
    .from("assessment_handoffs")
    .update({ picked_up_by_nurse_id: null })
    .in("picked_up_by_nurse_id", ids);
  if (pickupErr) throw pickupErr;

  const cascades: Array<[string, string]> = [
    ["assessment_handoffs", "released_by_nurse_id"],
    ["client_nurses", "nurse_id"],
    ["nurse_credentials", "nurse_id"],
    ["notification_preferences", "nurse_id"],
    ["notifications", "recipient_nurse_id"],
  ];

  for (const [table, column] of cascades) {
    const { error } = await supabase.from(table as any).delete().in(column, ids);
    if (error) throw error;
  }

  const { error } = await supabase.from("nurses").delete().in("id", ids);
  if (error) throw error;
}
