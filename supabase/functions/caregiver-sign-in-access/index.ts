import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { handleCaregiverAccess, type AccessSnapshot } from "./handler.ts";

const schema = z.object({
  caregiver_id: z.string().uuid(), confirmed_email: z.string().email().max(320),
  confirmed_name: z.string().min(1).max(300), confirmed: z.literal(true),
}).strict();

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (body: unknown, status: number) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  try {
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return respond({ error: "Sign-in access is unavailable. Please try again later." }, 503);
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await handleCaregiverAccess(req, {
      authenticate: async authorization => {
        const client = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await client.auth.getUser();
        return error ? null : data.user?.id ?? null;
      },
      isAdmin: async actor => {
        const { data, error } = await admin.from("user_roles").select("role").eq("user_id", actor).eq("role", "admin").maybeSingle();
        return !error && data?.role === "admin";
      },
      validate: body => { const parsed = schema.safeParse(body); return parsed.success ? parsed.data : null; },
      snapshot: async (actor, caregiver) => {
        const { data, error } = await admin.rpc("caregiver_access_snapshot", { p_actor_id: actor, p_caregiver_id: caregiver });
        if (error || !data) throw new Error("Access lookup failed");
        return data as AccessSnapshot;
      },
      record: async (actor, caregiver, email, requestId, event, detail) => {
        const { error } = await admin.rpc("record_caregiver_access_event", { p_actor_id: actor, p_caregiver_id: caregiver, p_email: email, p_request_id: requestId, p_event: event, p_detail: detail ?? null });
        if (error) throw new Error("Access audit failed");
      },
      createAccount: async email => {
        const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
        return error ? null : data.user?.id ?? null;
      },
      finish: async (actor, caregiver, email, account, requestId) => {
        const { data, error } = await admin.rpc("finish_caregiver_access", { p_actor_id: actor, p_caregiver_id: caregiver, p_email: email, p_account_id: account, p_request_id: requestId });
        if (error) throw new Error("Access setup failed");
        return data;
      },
      requestId: () => crypto.randomUUID(),
    });
    return respond(result.body, result.status);
  } catch {
    return respond({ error: "Access could not be confirmed. Review the current status and log before trying again." }, 500);
  }
});