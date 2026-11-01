import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { handleTrainingSignIn, UNAVAILABLE } from "./handler.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response(JSON.stringify({ code: "unavailable", error: UNAVAILABLE }), { status: 503, headers });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await handleTrainingSignIn(req, {
    async lookup(email) {
      const { data, error } = await client.rpc("lookup_training_caregiver", { p_email: email });
      if (error) throw error;
      return data;
    },
    async createAccount(email) {
      // No password and no global auto-confirm setting change. The email link
      // confirms the address before a caregiver obtains a signed-in session.
      const { data, error } = await client.auth.admin.createUser({ email, email_confirm: false });
      if (error) throw error;
      if (!data.user) throw new Error("Account creation unavailable");
      return data.user.id;
    },
    async connect(caregiverId, userId, email) {
      const { error } = await client.rpc("connect_training_caregiver", { p_caregiver_id: caregiverId, p_user_id: userId, p_email: email });
      if (error) throw error;
    },
    async sendLink(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: "https://homecareheadquarters.org/caregiver-training" },
      });
      if (error) throw error;
    },
  });
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
});