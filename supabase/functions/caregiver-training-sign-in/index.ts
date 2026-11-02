import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { handleTrainingSignIn, normalizeEmail, UNAVAILABLE } from "./handler.ts";
import { sendTrainingEmail } from "./email.ts";

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
    async sendLink(email, userId) {
      const emailRedirectTo = "https://homecareheadquarters.org/caregiver-training";
      // Public signup remains disabled. Unconfirmed admin-created accounts need
      // a confirmation resend, not an OTP request that GoTrue treats as signup.
      // Neither path creates an account or bypasses the recipient's email click.
      await sendTrainingEmail(email, userId, {
        async confirmed(id, address) {
          const { data, error } = await client.auth.admin.getUserById(id);
          if (error) throw error;
          if (!data.user?.email || normalizeEmail(data.user.email) !== address) throw new Error("Account identity changed");
          return Boolean(data.user.email_confirmed_at);
        },
        async magicLink(address) {
          const { error } = await client.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false, emailRedirectTo } });
          if (error) throw error;
        },
        async confirmationLink(address) {
          const { error } = await client.auth.resend({ type: "signup", email: address, options: { emailRedirectTo } });
          if (error) throw error;
        },
      });
    },
  });
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
});