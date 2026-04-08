import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Finds the first AC day in the schedule_data for a given month's calendar.
 * Returns the date string (YYYY-MM-DD) or null if no AC hours exist.
 */
function findFirstAcDay(
  scheduleData: Record<string, { pc: number; ac: number }>
): string | null {
  const entries = Object.entries(scheduleData)
    .filter(([_, v]) => v.ac > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.length > 0 ? entries[0][0] : null;
}

/**
 * Finds the last PC day in the schedule_data.
 */
function findLastPcDay(
  scheduleData: Record<string, { pc: number; ac: number }>
): string | null {
  const entries = Object.entries(scheduleData)
    .filter(([_, v]) => v.pc > 0)
    .sort(([a], [b]) => b.localeCompare(a));
  return entries.length > 0 ? entries[0][0] : null;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured - skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HomeCare <notifications@yourdomain.com>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: errText };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
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

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-based
    const currentYear = now.getFullYear();

    // Also check next month (warnings may span month boundary)
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    // Get all active ARChoices assignments with AC hours > 0
    const { data: assignments, error: assignErr } = await supabase
      .from("monthly_calendar_assignments")
      .select("*, caregivers(first_name, last_name, email), clients(first_name, last_name)")
      .eq("is_active", true)
      .eq("is_archoices", true)
      .gt("attendant_care_hours", 0);

    if (assignErr) throw assignErr;
    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No ARChoices assignments with AC hours" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get generated calendars for current and next month
    const assignmentIds = assignments.map((a: any) => a.id);
    const { data: calendars, error: calErr } = await supabase
      .from("monthly_calendars")
      .select("*")
      .in("assignment_id", assignmentIds)
      .or(
        `and(month.eq.${currentMonth},year.eq.${currentYear}),and(month.eq.${nextMonth},year.eq.${nextYear})`
      );

    if (calErr) throw calErr;

    const WARNING_DAYS = [3, 2, 1]; // days before AC starts
    const WARNING_HOUR = 1; // 1 hour before (same day)
    let warningsSent = 0;

    for (const cal of calendars || []) {
      const assignment = assignments.find((a: any) => a.id === cal.assignment_id);
      if (!assignment) continue;

      const scheduleData = cal.schedule_data as Record<string, { pc: number; ac: number }>;
      const firstAcDay = findFirstAcDay(scheduleData);
      const lastPcDay = findLastPcDay(scheduleData);

      if (!firstAcDay) continue;

      const acStartDate = new Date(firstAcDay + "T09:00:00"); // Assume 9 AM work start
      const caregiver = assignment.caregivers;
      const client = assignment.clients;

      if (!caregiver) continue;

      const caregiverName = `${caregiver.first_name} ${caregiver.last_name}`;
      const clientName = client
        ? `${client.first_name} ${client.last_name}`
        : "Unknown Client";

      // Check each warning threshold
      for (const daysBefore of WARNING_DAYS) {
        const warningDate = new Date(acStartDate);
        warningDate.setDate(warningDate.getDate() - daysBefore);

        // Only send if today matches the warning date
        const todayStr = now.toISOString().split("T")[0];
        const warningStr = warningDate.toISOString().split("T")[0];
        if (todayStr !== warningStr) continue;

        const warningKey = `cal-warn-${cal.assignment_id}-${cal.year}-${cal.month}-${daysBefore}d`;

        // Check if already sent
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("related_id", cal.id)
          .eq("notification_type", "calendar_transition_warning")
          .like("subject", `%${daysBefore} day%`)
          .maybeSingle();

        if (existing) continue;

        const subject = `⚠️ ${daysBefore} day${daysBefore > 1 ? "s" : ""} until Attendant Care hours begin for ${clientName}`;
        const message = `Hi ${caregiverName},\n\nThis is a reminder that your Personal Care hours for ${clientName} will end on ${lastPcDay} and Attendant Care hours will begin on ${firstAcDay}.\n\nPlease prepare for the transition from PC to AC services.\n\n— HomeCare`;

        // Create in-app notification
        const { error: notifErr } = await supabase.from("notifications").insert({
          user_id: assignment.user_id,
          notification_type: "calendar_transition_warning",
          related_id: cal.id,
          subject,
          message,
          recipient_email: caregiver.email || null,
        });

        if (notifErr) {
          console.error("Failed to create notification:", notifErr);
          continue;
        }

        // Send email if caregiver has an email
        if (caregiver.email) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a2e;">⚠️ Care Schedule Transition Warning</h2>
              <p>Hi <strong>${caregiverName}</strong>,</p>
              <p>This is a reminder that your care schedule for <strong>${clientName}</strong> is transitioning:</p>
              <div style="background: #f8f9fa; border-left: 4px solid #e91e63; padding: 16px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px 0;"><strong>Personal Care</strong> hours end on: <strong>${lastPcDay}</strong></p>
                <p style="margin: 0;"><strong>Attendant Care</strong> hours begin on: <strong>${firstAcDay}</strong></p>
              </div>
              <p>You have <strong>${daysBefore} day${daysBefore > 1 ? "s" : ""}</strong> to prepare for this transition.</p>
              <p style="color: #666; font-size: 14px;">— HomeCare Team</p>
            </div>
          `;

          const emailResult = await sendEmail(caregiver.email, subject, emailHtml);

          // Update notification with email status
          if (emailResult.success) {
            await supabase
              .from("notifications")
              .update({
                email_sent: true,
                email_sent_at: new Date().toISOString(),
              })
              .eq("related_id", cal.id)
              .eq("notification_type", "calendar_transition_warning")
              .like("subject", `%${daysBefore} day%`);
          }
        }

        warningsSent++;
      }

      // 1-hour warning: check if AC starts today and we're within 1 hour
      const todayStr = now.toISOString().split("T")[0];
      if (firstAcDay === todayStr) {
        const hoursUntilAcStart =
          (acStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilAcStart > 0 && hoursUntilAcStart <= 1) {
          // Check if already sent
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("related_id", cal.id)
            .eq("notification_type", "calendar_transition_warning")
            .like("subject", "%1 hour%")
            .maybeSingle();

          if (!existing) {
            const subject = `🔔 Attendant Care hours start in ~1 hour for ${clientName}`;
            const message = `Hi ${caregiverName},\n\nAttendant Care hours for ${clientName} begin today (${firstAcDay}). Personal Care hours have ended.\n\nPlease switch to AC services.\n\n— HomeCare`;

            await supabase.from("notifications").insert({
              user_id: assignment.user_id,
              notification_type: "calendar_transition_warning",
              related_id: cal.id,
              subject,
              message,
              recipient_email: caregiver.email || null,
            });

            if (caregiver.email) {
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a1a2e;">🔔 AC Hours Starting Now</h2>
                  <p>Hi <strong>${caregiverName}</strong>,</p>
                  <p>Attendant Care hours for <strong>${clientName}</strong> begin <strong>today</strong>.</p>
                  <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px; margin: 16px 0; border-radius: 4px;">
                    <p style="margin: 0;">Personal Care hours have ended. Please transition to <strong>Attendant Care</strong> services.</p>
                  </div>
                  <p style="color: #666; font-size: 14px;">— HomeCare Team</p>
                </div>
              `;
              await sendEmail(caregiver.email, subject, emailHtml);
            }

            warningsSent++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${warningsSent} calendar transition warnings` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending calendar warnings:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
