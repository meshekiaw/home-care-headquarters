import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { maintenanceSkip, normalizeMaintenanceEmail, shouldConfirmExistingMaintenanceAccount, validateMaintenanceMatch, type MaintenanceCaregiver } from "../_shared/caregiver-account-maintenance.ts";

// Explicit, time-limited maintenance only. Removed after the requested operation.
const DEADLINE = Date.parse("2026-11-02T08:15:00Z");
const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function authorized(req: Request): Promise<boolean> {
  const secret = Deno.env.get("LOVABLE_API_KEY");
  const supplied = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!secret || !supplied || Date.now() > DEADLINE) return false;
  const [a, b] = await Promise.all([secret, supplied].map(value => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let different = 0;
  for (let i = 0; i < left.length; i++) different |= left[i] ^ right[i];
  return different === 0;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST" || !await authorized(req)) return respond({ error: "Maintenance access denied" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return respond({ error: "Maintenance unavailable" }, 503);
  try {
    const body = await req.json();
    if (!Number.isInteger(body.offset) || body.offset < 0 || !Number.isInteger(body.limit) || body.limit < 1 || body.limit > 20 || typeof body.execute !== "boolean") return respond({ error: "Invalid batch" }, 400);
    // Reject every network path that could email, sign in, or change a password.
    const safeFetch: typeof fetch = async (input, init) => {
      const target = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (target.origin !== new URL(url).origin) throw new Error("Unexpected maintenance destination");
      const method = init?.method ?? "GET";
      const authAdmin = /^\/auth\/v1\/admin\/users(?:\/[^/]+)?$/.test(target.pathname);
      const allowedRest = ["/rest/v1/caregivers", "/rest/v1/user_roles", "/rest/v1/rpc/lookup_training_caregiver", "/rest/v1/rpc/connect_training_caregiver"].includes(target.pathname);
      if (!authAdmin && !allowedRest) throw new Error("Operation outside maintenance scope");
      if (authAdmin && method !== "GET") {
        const payload = JSON.parse(String(init?.body ?? "{}"));
        const allowed = method === "POST" ? ["email", "email_confirm"] : ["email_confirm"];
        if (!["POST", "PUT"].includes(method) || Object.keys(payload).some(k => !allowed.includes(k)) || payload.email_confirm !== true) throw new Error("Forbidden auth mutation");
      }
      return fetch(input, init);
    };
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: safeFetch } });
    const { data: caregivers, error: caregiverError } = await client.from("caregivers").select("id,first_name,last_name,status,email,auth_user_id").order("id");
    if (caregiverError || !caregivers) throw new Error("Cannot read caregiver inventory");
    const active = (caregivers as MaintenanceCaregiver[]).filter(c => c.status === "active");
    const batch = active.slice(body.offset, body.offset + body.limit);
    const results = [];
    for (const c of batch) {
      const name = `${c.first_name} ${c.last_name}`;
      const skip = maintenanceSkip(c);
      if (skip) { results.push({ name, action: "skipped", reason: skip }); continue; }
      const email = normalizeMaintenanceEmail(c.email);
      try {
        const { data: match, error: lookupError } = await client.rpc("lookup_training_caregiver", { p_email: email });
        if (lookupError || match?.caregiver_id !== c.id) throw new Error("Email or existing connection needs office review");
        if (!body.execute) { results.push({ name, action: match.user_id ? "existing_account" : "needs_account" }); continue; }
        let accountId: string | null = match.user_id;
        let created = false;
        if (!accountId) {
          const { data, error } = await client.auth.admin.createUser({ email, email_confirm: true });
          if (error || !data.user) throw new Error("Account creation failed; no emails sent");
          accountId = data.user.id;
          created = true;
        }
        const { data: accountData, error: accountError } = await client.auth.admin.getUserById(accountId);
        const account = accountData.user;
        if (accountError || !account) throw new Error("Account verification failed");
        validateMaintenanceMatch(c, account, caregivers.some(other => other.id !== c.id && other.auth_user_id === accountId));
        const { data: roleData, error: roleError } = await client.from("user_roles").select("role").eq("user_id", accountId);
        if (roleError || !roleData) throw new Error("Role verification failed");
        if (roleData.some(r => r.role === "nurse")) throw new Error("Protected nurse role: no changes made");
        if (shouldConfirmExistingMaintenanceAccount(email, Boolean(account.email_confirmed_at))) {
          const { error } = await client.auth.admin.updateUserById(accountId, { email_confirm: true });
          if (error) throw new Error("Email confirmation failed");
        }
        const { error: connectError } = await client.rpc("connect_training_caregiver", { p_caregiver_id: c.id, p_user_id: accountId, p_email: email });
        if (connectError) throw new Error("Account connection failed");
        // The ordinary training helper preserves admin roles and does not add
        // caregiver to protected admins. This explicit maintenance adds only
        // the requested role, without ever removing an existing role.
        if (roleData.some(r => r.role === "admin") && !roleData.some(r => r.role === "caregiver")) {
          const { error } = await client.from("user_roles").upsert({ user_id: accountId, role: "caregiver" }, { onConflict: "user_id,role", ignoreDuplicates: true });
          if (error) throw new Error("Caregiver role addition failed");
        }
        const { data: finalRecord, error: recordError } = await client.from("caregivers").select("auth_user_id").eq("id", c.id).single();
        const { data: finalRoles, error: finalRoleError } = await client.from("user_roles").select("role").eq("user_id", accountId);
        if (recordError || finalRoleError || finalRecord?.auth_user_id !== accountId || !finalRoles?.some(r => r.role === "caregiver") || roleData.some(r => !finalRoles.some(f => f.role === r.role)) || (created && finalRoles.some(r => r.role !== "caregiver"))) throw new Error("Final account verification failed");
        results.push({ name, action: created ? "created_and_connected" : c.auth_user_id ? "already_connected" : "connected_existing", email_confirmed: Boolean(account.email_confirmed_at) });
      } catch (error) {
        results.push({ name, action: "needs_review", reason: error instanceof Error ? error.message : "Maintenance failed" });
      }
    }
    return respond({ active_count: active.length, offset: body.offset, processed: batch.length, results });
  } catch { return respond({ error: "Maintenance could not run" }, 500); }
});