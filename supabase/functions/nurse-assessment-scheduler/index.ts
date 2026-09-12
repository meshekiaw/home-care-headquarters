import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendAppEmail } from "../_shared/send-app-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://homecareheadquarters.org";

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const today = new Date().toISOString().split("T")[0];
  const result = { created: 0, overdue: 0, notified: 0, reminders: 0, errors: [] as string[] };

  try {
    // --- Recipients (no PHI is ever sent to them) ---
    const { data: recipients } = await supabase
      .from("nurses")
      .select("id, first_name, last_name, email")
      .eq("receives_618_notifications", true)
      .eq("status", "active");

    const emails = (recipients ?? [])
      .map((n) => n.email)
      .filter((e): e is string => !!e);

    // --- 1. Auto-create assessments for any 618 due within the next 30 days or already past ---
    const target = addDays(30);
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, user_id, form_618_expiration_date, status")
      .eq("status", "active")
      .not("form_618_expiration_date", "is", null)
      .lte("form_618_expiration_date", target);

    if (clientsError) throw clientsError;

    for (const client of clients ?? []) {
      const { error } = await supabase.from("nurse_assessments").insert({
        user_id: client.user_id,
        client_id: client.id,
        assessment_type: "618",
        due_date: client.form_618_expiration_date,
        status: client.form_618_expiration_date! < today ? "Overdue" : "Pending",
      });
      if (error) {
        // 23505 = duplicate; the unique index makes this job idempotent
        if (!String(error.code).includes("23505")) {
          result.errors.push(`create ${client.id}: ${error.message}`);
        }
        continue;
      }
      result.created += 1;
    }

    // --- 1b. Auto-create Nurse Visit assessments 30 days before the due date (VA clients only) ---
    const { data: vaClients, error: vaError } = await supabase
      .from("clients")
      .select("id, user_id, nurse_visit_due_date, status, payer_type")
      .eq("status", "active")
      .eq("payer_type", "VA")
      .eq("nurse_visit_due_date", target);

    if (vaError) throw vaError;

    for (const client of vaClients ?? []) {
      const { error } = await supabase.from("nurse_assessments").insert({
        user_id: client.user_id,
        client_id: client.id,
        assessment_type: "Nurse Visit",
        due_date: client.nurse_visit_due_date,
        status: "Pending",
      });
      if (error) {
        if (!String(error.code).includes("23505")) {
          result.errors.push(`create nurse visit ${client.id}: ${error.message}`);
        }
        continue;
      }
      result.created += 1;
    }

    // --- 2. Mark overdue ---
    const { data: overdue, error: overdueError } = await supabase
      .from("nurse_assessments")
      .update({ status: "Overdue" })
      .lt("due_date", today)
      .in("status", ["Pending", "Claimed"])
      .select("id");
    if (overdueError) result.errors.push(`overdue: ${overdueError.message}`);
    result.overdue = overdue?.length ?? 0;

    // --- 3. Notify nurses of newly created assessments (no PHI) ---
    const { data: pendingNew } = await supabase
      .from("nurse_assessments")
      .select("id, due_date, assessment_type")
      .is("created_notification_sent_at", null)
      .eq("status", "Pending");

    for (const assessment of pendingNew ?? []) {
      const link = `${SITE_URL}/assessments/${assessment.id}/claim`;
      const label = assessment.assessment_type === "Nurse Visit" ? "Nurse Visit" : "618 assessment";
      const heading = assessment.assessment_type === "Nurse Visit" ? "Nurse Visit" : "618 Assessment";
      for (const email of emails) {
        const res = await sendAppEmail(
          email,
          `A ${label} is due in 30 days`,
          `<h2>${heading} Available</h2>
           <p>A ${label} is due in 30 days and is available to claim.</p>
           <p>For privacy reasons no client details are included in this email. Please sign in to view the assignment and claim it.</p>
           <p><a href="${link}">Sign in to view and claim this assessment</a></p>`,
          { idempotencyKey: `na-new-${assessment.id}-${email.toLowerCase()}` },
        );
        if (res.success) result.notified += 1;
        else result.errors.push(`notify ${assessment.id}: ${res.error}`);
      }
      await supabase
        .from("nurse_assessments")
        .update({ created_notification_sent_at: new Date().toISOString() })
        .eq("id", assessment.id);
    }

    // --- 4. Reminders at 14 and 7 days out while still Pending ---
    for (const days of [14, 7]) {
      const column = days === 14 ? "reminder_14_sent_at" : "reminder_7_sent_at";
      const { data: due } = await supabase
        .from("nurse_assessments")
        .select("id, due_date, assessment_type")
        .eq("status", "Pending")
        .eq("due_date", addDays(days))
        .is(column, null);

      for (const assessment of due ?? []) {
        const link = `${SITE_URL}/assessments/${assessment.id}/claim`;
        const label = assessment.assessment_type === "Nurse Visit" ? "Nurse Visit" : "618 assessment";
        const heading = assessment.assessment_type === "Nurse Visit" ? "Nurse Visit" : "618 Assessment";
        for (const email of emails) {
          const res = await sendAppEmail(
            email,
            `Reminder: a ${label} is due in ${days} days`,
            `<h2>${heading} Still Unclaimed</h2>
             <p>A ${label} is due in ${days} days and has not been claimed yet.</p>
             <p>No client details are included in this email. Please sign in to view and claim it.</p>
             <p><a href="${link}">Sign in to view and claim this assessment</a></p>`,
            { idempotencyKey: `na-rem${days}-${assessment.id}-${email.toLowerCase()}` },
          );
          if (res.success) result.reminders += 1;
          else result.errors.push(`reminder ${assessment.id}: ${res.error}`);
        }
        await supabase
          .from("nurse_assessments")
          .update({ [column]: new Date().toISOString() })
          .eq("id", assessment.id);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("nurse-assessment-scheduler error:", error);
    return new Response(
      JSON.stringify({ error: String(error), ...result }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
