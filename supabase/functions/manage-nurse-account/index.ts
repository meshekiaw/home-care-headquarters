// Admin-only: keep a nurse's login in sync with their record.
// Actions: email_changed (invalidates outstanding invite links), deactivate, reactivate.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function findUserByEmail(supabaseUrl: string, serviceRoleKey: string, email: string) {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=200&filter=${encodeURIComponent(email)}`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const users: { id: string; email?: string }[] = data.users ?? [];
  return users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase()) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (bearer !== serviceRoleKey) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await userClient.auth.getUser();
      if (!caller) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!isAdmin) return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json();
    const action: string = body.action;
    const email: string = (body.email ?? "").trim().toLowerCase();
    const newEmail: string = (body.new_email ?? "").trim().toLowerCase();

    if (!action) return json({ error: "Missing action" }, 400);
    if (!email) return json({ ok: true, note: "No login on file" });

    const user = await findUserByEmail(supabaseUrl, serviceRoleKey, email);
    if (!user) return json({ ok: true, note: "No login on file" });

    if (action === "email_changed") {
      if (!newEmail) return json({ error: "Missing new_email" }, 400);
      // Changing the auth email invalidates any outstanding invite/recovery token.
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        email: newEmail,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      await admin.auth.admin.signOut(user.id, "global").catch(() => {});
      return json({ ok: true, invalidated: true });
    }

    if (action === "deactivate") {
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        ban_duration: "876000h",
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from("user_roles").delete().eq("user_id", user.id).eq("role", "nurse");
      await admin.auth.admin.signOut(user.id, "global").catch(() => {});
      return json({ ok: true, deactivated: true });
    }

    if (action === "reactivate") {
      const { error } = await admin.auth.admin.updateUserById(user.id, { ban_duration: "none" });
      if (error) return json({ error: error.message }, 400);
      await admin
        .from("user_roles")
        .upsert({ user_id: user.id, role: "nurse" }, { onConflict: "user_id,role" });
      return json({ ok: true, reactivated: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
