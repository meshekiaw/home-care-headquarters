import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { handlePasswordReset } from "./handler.ts";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, passwordProblem } from "./rules.ts";

const schema = z.object({
  caregiver_id: z.string().uuid(),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH)
    .refine(value => passwordProblem(value) === null),
}).strict();

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (body: unknown, status: number) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return respond({ error: "Password changes are unavailable. Please try again later." }, 503);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await handlePasswordReset(req, {
      authenticate: async authorization => {
        const client = createClient(url, anonKey, {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await client.auth.getUser();
        return error ? null : data.user?.id ?? null;
      },
      isAdmin: async userId => {
        const { data, error } = await admin.from("user_roles").select("role")
          .eq("user_id", userId).eq("role", "admin").maybeSingle();
        return !error && data?.role === "admin";
      },
      validate: input => {
        const result = schema.safeParse(input);
        return result.success ? result.data : null;
      },
      caregiverLogin: async caregiverId => {
        const { data, error } = await admin.from("caregivers").select("auth_user_id").eq("id", caregiverId).maybeSingle();
        return error ? null : data?.auth_user_id ?? null;
      },
      roles: async userId => {
        const { data, error } = await admin.from("user_roles").select("role").eq("user_id", userId);
        return error ? [] : (data ?? []).map(row => row.role);
      },
      audit: async (actorId, caregiverId, outcome) => {
        const { error } = await admin.from("audit_logs").insert({
          user_id: actorId, table_name: "caregivers", record_id: caregiverId,
          action: "CAREGIVER_PASSWORD_RESET", new_data: { outcome },
        });
        return !error;
      },
      updatePassword: async (userId, password) => {
        // The email, roles and caregiver link are intentionally left unchanged.
        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        return !error;
      },
    });
    return respond(result.body, result.status);
  } catch {
    // Never log or return request bodies, credentials, or raw authentication errors.
    return respond({ error: "We could not confirm the password change. Check the audit log before trying again." }, 500);
  }
});