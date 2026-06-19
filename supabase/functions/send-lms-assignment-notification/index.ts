import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let out = "";
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  for (const b of buf) out += chars[b % chars.length];
  return out;
}

async function sendSms(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) {
    console.log("[SMS] Skipped — TWILIO_* secrets not configured");
    return { skipped: true };
  }
  const auth = btoa(`${sid}:${token}`);
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await r.text();
  console.log(`[SMS] status=${r.status} body=${text.slice(0, 300)}`);
  return { ok: r.ok, status: r.status };
}

async function findAuthUserByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  let page = 1;
  // Paginate through users (default perPage 50)
  while (page < 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u: any) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page++;
  }
  return null;
}

serve(async (req) => {
  console.log(`[lms-notify] ${req.method} request received`);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const siteUrl = Deno.env.get("SITE_URL") || "https://homecareheadquarters.org";

    console.log(`[lms-notify] env: resend=${!!resendKey} from=${fromEmail} twilio=${!!Deno.env.get("TWILIO_ACCOUNT_SID")}`);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    console.log("[lms-notify] payload:", JSON.stringify(body));
    const { assignment_ids } = body;
    if (!Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return new Response(JSON.stringify({ error: "assignment_ids required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: assignments, error: aErr } = await admin
      .from("lms_assignments")
      .select("id, due_date, course_id, caregiver_id, lms_courses(title), caregivers(id, first_name, last_name, email, phone, auth_user_id)")
      .in("id", assignment_ids);
    if (aErr) throw aErr;
    console.log(`[lms-notify] loaded ${assignments?.length ?? 0} assignments`);

    const resend = resendKey ? new Resend(resendKey) : null;
    const loginUrl = `${siteUrl}/login`;
    const results: any[] = [];
    const warnings: string[] = [];
    if (!resend) warnings.push("RESEND_API_KEY is not configured — emails were NOT sent.");

    const byCaregiver = new Map<string, any[]>();
    for (const a of assignments || []) {
      const arr = byCaregiver.get(a.caregiver_id) || [];
      arr.push(a);
      byCaregiver.set(a.caregiver_id, arr);
    }

    for (const [caregiverId, items] of byCaregiver) {
      const cg = (items[0] as any).caregivers;
      console.log(`[lms-notify] caregiver=${caregiverId} email=${cg?.email} auth_user_id=${cg?.auth_user_id}`);
      if (!cg?.email) {
        results.push({ caregiver_id: caregiverId, skipped: "no_email" });
        continue;
      }

      let tempPassword: string | null = null;
      let provisioned = false;
      let authUserId: string | null = cg.auth_user_id;

      if (!authUserId) {
        tempPassword = genPassword();
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: cg.email,
          password: tempPassword,
          email_confirm: true,
        });
        if (cErr) {
          console.log(`[lms-notify] createUser failed (${cErr.message}); looking up existing user`);
          authUserId = await findAuthUserByEmail(admin, cg.email);
          if (authUserId) {
            await admin.from("caregivers").update({ auth_user_id: authUserId }).eq("id", caregiverId);
            tempPassword = null;
          } else {
            results.push({ caregiver_id: caregiverId, error: cErr.message });
            continue;
          }
        } else if (created.user) {
          authUserId = created.user.id;
          await admin.from("caregivers").update({ auth_user_id: authUserId, temp_password_sent_at: new Date().toISOString() }).eq("id", caregiverId);
          provisioned = true;
        }
      }

      // Ensure caregiver role exists (idempotent for both new and pre-existing accounts)
      if (authUserId) {
        const { error: roleErr } = await admin
          .from("user_roles")
          .upsert({ user_id: authUserId, role: "caregiver" }, { onConflict: "user_id,role", ignoreDuplicates: true });
        if (roleErr) console.log(`[lms-notify] role upsert warning: ${roleErr.message}`);
      }

      const courseList = items.map((i: any) => {
        const due = i.due_date ? `<strong>Due:</strong> ${new Date(i.due_date).toLocaleDateString()}` : "<em>No due date</em>";
        return `<li style="margin-bottom:8px;"><strong>${i.lms_courses?.title || "Course"}</strong><br/><span style="color:#6b7280;font-size:13px;">${due}</span></li>`;
      }).join("");

      const credBlock = provisioned && tempPassword ? `
        <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px 0;font-weight:600;color:#1e3a8a;">Your login credentials</p>
          <p style="margin:4px 0;font-size:14px;"><strong>Email:</strong> ${cg.email}</p>
          <p style="margin:4px 0;font-size:14px;"><strong>Temporary password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
          <p style="margin:8px 0 0 0;font-size:12px;color:#475569;">Please change your password after your first login.</p>
        </div>
      ` : "";

      let emailed = false;
      let emailError: string | null = null;
      if (resend) {
        try {
          const { data: sent, error: sendErr } = await resend.emails.send({
            from: `Home Care Headquarters <${fromEmail}>`,
            to: [cg.email],
            subject: `New training assigned: ${items[0].lms_courses?.title || "Course"}${items.length > 1 ? ` (+${items.length - 1} more)` : ""}`,
            html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);padding:28px;border-radius:10px 10px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:22px;">Training Assigned</h1>
              </div>
              <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
                <p>Hi ${cg.first_name},</p>
                <p>You have been assigned the following training course${items.length > 1 ? "s" : ""}:</p>
                <ul style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px 16px 16px 32px;">${courseList}</ul>
                ${credBlock}
                <p style="text-align:center;margin:24px 0;">
                  <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;">Log in to start training</a>
                </p>
                <p style="font-size:13px;color:#6b7280;">If the button doesn't work, copy this link: ${loginUrl}</p>
              </div>
            </body></html>`,
          });
          if (sendErr) {
            emailError = sendErr.message || JSON.stringify(sendErr);
            console.error("[lms-notify] resend error:", sendErr);
          } else {
            emailed = true;
            console.log(`[lms-notify] email sent id=${(sent as any)?.id}`);
          }
        } catch (e: any) {
          emailError = e.message || String(e);
          console.error("[lms-notify] email exception:", e);
        }
      }

      let smsResult: any = { skipped: true };
      if (cg.phone) {
        const smsBody = `Home Care HQ: New training "${items[0].lms_courses?.title || "Course"}"${items.length > 1 ? ` and ${items.length - 1} more` : ""} assigned. Log in: ${loginUrl}${provisioned && tempPassword ? ` Temp password: ${tempPassword}` : ""}`;
        try { smsResult = await sendSms(cg.phone, smsBody); } catch (e: any) {
          console.error("[lms-notify] SMS failed", e);
          smsResult = { error: e.message };
        }
      }

      if (emailed) {
        await admin
          .from("lms_assignments")
          .update({ notification_sent_at: new Date().toISOString() })
          .in("id", items.map((i: any) => i.id));
      }

      results.push({ caregiver_id: caregiverId, count: items.length, provisioned, emailed, emailError, sms: smsResult });
    }

    return new Response(JSON.stringify({ success: true, warnings, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[lms-notify] fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
