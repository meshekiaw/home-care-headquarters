import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { handleCaregiverAccess, type AccessSnapshot } from "./handler.ts";

const schema = z.object({
  caregiver_id: z.string().uuid(), confirmed_email: z.string().email().max(320),
  confirmed_name: z.string().min(1).max(300), confirmed: z.literal(true),
  action: z.enum(["update_email", "switch_account"]).optional(), confirmed_account_email: z.string().email().max(320).optional(),
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
      repair: async (actor, input, requestId) => {
        const { data: plan, error: preparationError } = await admin.rpc("prepare_caregiver_email_repair", {
          p_actor_id: actor, p_caregiver_id: input.caregiver_id, p_email: input.confirmed_email,
          p_name: input.confirmed_name, p_old_email: input.confirmed_account_email, p_action: input.action, p_request_id: requestId,
        });
        if (preparationError || !plan) throw new Error(preparationError?.message || "Refresh access and confirm the email repair again.");
        let authChanged = false;
        try {
          // Only the server-resolved caregiver account is updated. Auth Admin
          // confirms silently; no OTP/resend/password method is called here.
          const { error: updateError } = await admin.auth.admin.updateUserById(plan.target_account_id, {
            ...(input.action === "update_email" ? { email: plan.target_email } : {}), email_confirm: true,
          });
          if (updateError) throw new Error("The account email could not be updated. Another account may now use it. Refresh access.");
          authChanged = true;
          const { data, error: finishError } = await admin.rpc("finish_caregiver_email_repair", { p_actor_id: actor, p_request_id: requestId });
          if (finishError || !data) throw new Error("Account confirmation succeeded, but access could not be finalized. Review the access log before retrying.");
          return data;
        } catch (error) {
          let detail = error instanceof Error ? error.message : "Email repair did not finish.";
          // Do not undo a confirmed Auth write blindly: a lost response may
          // follow a committed finalization. Audit partial success for review.
          if (authChanged) detail += " The account confirmation may already be applied; the training records were not deleted.";
          await admin.rpc("fail_caregiver_email_repair", { p_actor_id: actor, p_request_id: requestId, p_detail: detail });
          throw new Error(detail);
        }
      },
    });
    return respond(result.body, result.status);
  } catch {
    return respond({ error: "Access could not be confirmed. Review the current status and log before trying again." }, 500);
  }
});