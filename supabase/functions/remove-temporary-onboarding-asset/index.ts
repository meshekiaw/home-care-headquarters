import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.118.0/cors";

// One-time cleanup of a non-personal placeholder uploaded by the implementation agent.
// No caller input is accepted; no caregiver document record is read or modified.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response("Unavailable", { status: 503, headers: corsHeaders });
  const client = createClient(url, key, { auth: { persistSession: false } });
  const bucket = client.storage.from("caregiver-documents");
  const path = "test-placeholder.svg";
  const { data, error } = await bucket.download(path);
  if (error || !data) return new Response("Not found", { status: 404, headers: corsHeaders });
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await data.arrayBuffer()));
  const hash = Array.from(digest).map(value => value.toString(16).padStart(2, "0")).join("");
  if (hash !== "64badf7aabda0b9630b87020ffb6095cb858ccbcf66b355c2aa08b1063954d3b") return new Response("Refused", { status: 409, headers: corsHeaders });
  const removed = await bucket.remove([path]);
  return new Response(JSON.stringify({ removed: !removed.error }), { status: removed.error ? 500 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});