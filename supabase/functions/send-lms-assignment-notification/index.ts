import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://homecareheadquarters.org";
const SUPPORT_EMAIL = "homcarenetwork4@gmail.com";

async function sendSms(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) return { skipped: true, reason: "twilio_not_configured" };
  const auth = btoa(`${sid}:${token}`);
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await r.text();
  console.log(`[lms-notify][sms] status=${r.status} body=${text.slice(0, 200)}`);
  return { ok: r.ok, status: r.status };
}

async function findAuthUserByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  let page = 1;
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

async function buildMagicLink(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ url: string; hashed_token: string }> {
  // Generate a magic-link token. We deliberately do NOT use properties.action_link,
  // because that URL hits Supabase's /auth/v1/verify on first GET and would let
  // email/SMS link scanners consume the token before the user clicks. Instead we
  // build our own URL pointing to /auth/magic-link, which only calls verifyOtp
  // after an explicit user click.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${SITE_URL}/my-training`,
    },
  });
  if (error) throw new Error(`generateLink failed: ${error.message}`);
  const hashed_token = (data as any)?.properties?.hashed_token;
  if (!hashed_token) throw new Error("generateLink returned no hashed_token");
  const url =
    `${SITE_URL}/auth/magic-link` +
    `?token_hash=${encodeURIComponent(hashed_token)}` +
    `&type=magiclink` +
    `&next=${encodeURIComponent("/my-training")}`;
  return { url, hashed_token };
}

serve(async (req) => {
  console.log(`[lms-notify] ${req.method} request`);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("[lms-notify] payload:", JSON.stringify(body));
    const { assignment_ids } = body;
    if (!Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return new Response(JSON.stringify({ error: "assignment_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assignments, error: aErr } = await admin
      .from("lms_assignments")
      .select(
        "id, due_date, course_id, caregiver_id, lms_courses(title), caregivers(id, first_name, last_name, email, phone, auth_user_id)",
      )
      .in("id", assignment_ids);
    if (aErr) throw aErr;
    console.log(`[lms-notify] loaded ${assignments?.length ?? 0} assignments`);

    const results: any[] = [];

    const byCaregiver = new Map<string, any[]>();
    for (const a of assignments || []) {
      const arr = byCaregiver.get(a.caregiver_id) || [];
      arr.push(a);
      byCaregiver.set(a.caregiver_id, arr);
    }

    for (const [caregiverId, items] of byCaregiver) {
      const cg = (items[0] as any).caregivers;
      console.log(`[lms-notify] caregiver=${caregiverId} email=${cg?.email} auth=${cg?.auth_user_id}`);
      if (!cg?.email) {
        results.push({ caregiver_id: caregiverId, skipped: "no_email" });
        continue;
      }

      // 1. Ensure auth user exists (passwordless — no password set here).
      let authUserId: string | null = cg.auth_user_id;
      if (!authUserId) {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: cg.email,
          email_confirm: true,
        });
        if (cErr) {
          console.log(`[lms-notify] createUser failed (${cErr.message}); searching existing users`);
          authUserId = await findAuthUserByEmail(admin, cg.email);
          if (!authUserId) {
            results.push({ caregiver_id: caregiverId, error: `createUser: ${cErr.message}` });
            continue;
          }
        } else {
          authUserId = created.user!.id;
        }
        await admin.from("caregivers").update({ auth_user_id: authUserId }).eq("id", caregiverId);
      }

      // 2. Ensure caregiver role is committed BEFORE the magic link is generated.
      // ProtectedRoute would otherwise show "Setting up your account".
      const { error: roleErr } = await admin
        .from("user_roles")
        .upsert({ user_id: authUserId, role: "caregiver" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleErr) {
        console.error(`[lms-notify] role assignment failed for ${authUserId}: ${roleErr.message}`);
        results.push({ caregiver_id: caregiverId, error: `role: ${roleErr.message}` });
        continue;
      }

      // 3. Build our own magic-link URL (never Supabase's action_link).
      let magicUrl: string;
      try {
        const link = await buildMagicLink(admin, cg.email);
        magicUrl = link.url;
      } catch (e: any) {
        console.error(`[lms-notify] magic link failed:`, e);
        results.push({ caregiver_id: caregiverId, error: `magic_link: ${e.message}` });
        continue;
      }

      // 4. Enqueue branded email through the Lovable Emails queue.
      const courses = items.map((i: any) => ({
        title: i.lms_courses?.title || "Course",
        dueDate: i.due_date ?? null,
      }));

      // Scope idempotency key to recipient — if the caregiver's email changes,
      // a new key is generated so the send isn't rejected as recipient_mismatch
      // against the previously-notified address.
      const recipientTag = cg.email.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40);
      const idempotencyKey = `lms-assign-${items.map((i: any) => i.id).sort().join("-")}-${recipientTag}`;
      let emailed = false;
      let emailError: string | null = null;
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            templateName: "lms-assignment-notification",
            recipientEmail: cg.email,
            idempotencyKey,
            templateData: {
              firstName: cg.first_name || "there",
              courses,
              loginUrl: magicUrl,
              supportEmail: SUPPORT_EMAIL,
            },
          }),
        });
        const respText = await resp.text();
        console.log(`[lms-notify] send-transactional-email status=${resp.status} body=${respText.slice(0, 400)}`);
        if (!resp.ok) {
          emailError = `send-transactional-email ${resp.status}: ${respText.slice(0, 300)}`;
        } else {
          emailed = true;
        }
      } catch (e: any) {
        emailError = e.message || String(e);
        console.error(`[lms-notify] email exception:`, e);
      }

      // 5. Optional SMS (still supports Gmail/personal emails via the button link).
      let smsResult: any = { skipped: true };
      if (cg.phone) {
        const smsBody =
          `Home Care HQ: New training "${courses[0].title}"` +
          (courses.length > 1 ? ` and ${courses.length - 1} more` : "") +
          ` assigned. Tap to sign in: ${magicUrl}`;
        try {
          smsResult = await sendSms(cg.phone, smsBody);
        } catch (e: any) {
          console.error(`[lms-notify] SMS failed`, e);
          smsResult = { error: e.message };
        }
      }

      if (emailed) {
        await admin
          .from("lms_assignments")
          .update({ notification_sent_at: new Date().toISOString() })
          .in("id", items.map((i: any) => i.id));
      }

      results.push({
        caregiver_id: caregiverId,
        count: items.length,
        emailed,
        emailError,
        sms: smsResult,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
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
