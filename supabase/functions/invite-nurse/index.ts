// Admin-only: create/refresh a restricted nurse login and email a time-limited invite link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";
import { sendAppEmail } from "../_shared/send-app-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_ORIGIN = "https://homecareheadquarters.org";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = await req.json();
    const nurseIds: string[] = body.nurse_ids ?? (body.nurse_id ? [body.nurse_id] : []);
    if (nurseIds.length === 0) return json({ error: "Missing nurse_id" }, 400);

    const { data: nurses, error: nurseErr } = await admin
      .from("nurses")
      .select("id, first_name, last_name, email")
      .in("id", nurseIds);
    if (nurseErr) return json({ error: nurseErr.message }, 400);

    const results: { nurse: string; success: boolean; error?: string }[] = [];

    for (const nurse of nurses ?? []) {
      const name = `${nurse.first_name} ${nurse.last_name}`;
      const email = (nurse.email ?? "").trim().toLowerCase();
      if (!email) {
        results.push({ nurse: name, success: false, error: "No email on file" });
        continue;
      }

      try {
        // Invite for new users, recovery (set-password) link for existing accounts.
        let linkType: "invite" | "recovery" = "invite";
        let gen = await admin.auth.admin.generateLink({ type: "invite", email });
        if (gen.error) {
          linkType = "recovery";
          gen = await admin.auth.admin.generateLink({ type: "recovery", email });
        }
        if (gen.error) throw gen.error;

        const authUserId = gen.data.user?.id;
        const hashedToken = gen.data.properties?.hashed_token;
        if (!authUserId || !hashedToken) throw new Error("Could not generate invite link");

        // Grant only the restricted nurse role.
        const { error: roleErr } = await admin
          .from("user_roles")
          .upsert({ user_id: authUserId, role: "nurse" }, { onConflict: "user_id,role" });
        if (roleErr) throw roleErr;

        const link = `${APP_ORIGIN}/nurse-invite?token_hash=${encodeURIComponent(hashedToken)}&type=${linkType}`;

        const html = `
          <h2>Your nurse sign-in for Home Care Headquarters</h2>
          <p>Hello ${name},</p>
          <p>You've been given access to the nurse assessment portal. Click the button below to set your password and sign in. No client information is shown until you sign in.</p>
          <p style="margin:24px 0;">
            <a href="${link}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Set your password</a>
          </p>
          <p><strong>This link expires in 24 hours.</strong> If it expires, ask your coordinator to send a new one.</p>
          <p>If you did not expect this email, you can ignore it.</p>
        `;

        const sent = await sendAppEmail(email, "Set up your nurse sign-in", html, {
          idempotencyKey: `nurse-invite-${authUserId}-${Date.now()}`,
        });
        if (!sent.success) throw new Error(sent.error ?? "Email send failed");

        results.push({ nurse: name, success: true });
      } catch (err) {
        results.push({ nurse: name, success: false, error: (err as Error).message });
      }
    }

    return json({ results });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
