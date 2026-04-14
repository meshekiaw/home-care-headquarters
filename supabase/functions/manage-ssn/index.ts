import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the user's JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    const isAdmin = roleData && roleData.length > 0;

    const { action, caregiver_id, ssn } = await req.json();

    if (action === "encrypt" && ssn && caregiver_id) {
      // Validate SSN format
      const ssnClean = ssn.replace(/\D/g, "");
      if (ssnClean.length !== 9) {
        return new Response(JSON.stringify({ error: "Invalid SSN format" }), { status: 400, headers: corsHeaders });
      }

      const { error } = await supabase.rpc("encrypt_ssn_for_caregiver", {
        p_caregiver_id: caregiver_id,
        p_ssn: ssnClean,
      });

      if (error) {
        // Fallback: use direct update with encrypt function
        const { error: updateError } = await supabase
          .from("caregivers")
          .update({ ssn_encrypted: null }) // Will be handled by the function
          .eq("id", caregiver_id);
          
        // Use raw SQL via rpc
        await supabase.rpc("update_caregiver_ssn", { p_id: caregiver_id, p_ssn: ssnClean });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "decrypt" && caregiver_id && isAdmin) {
      const { data, error } = await supabase
        .rpc("get_caregiver_ssn_masked", { p_caregiver_id: caregiver_id });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ masked_ssn: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
