import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CALL_OFF_SYSTEM = `You are the Scheduling Coordinator AI for Home Care Network, a personal care agency in Arkansas serving ARChoices/Medicaid, DHS Waiver, Private Pay, and Optum/VA clients. You understand AxisCare workflows and Authenticare EVV/visit-verification requirements. When a caregiver calls off, generate a complete, calm, professional response packet. Be specific and actionable, never generic. Use Arkansas-appropriate terminology.`;

const EVV_SYSTEM = `You are a compliance documentation specialist for Home Care Network in Arkansas. You write formal EVV correction/exception notes acceptable to Authenticare and ARChoices auditors. Notes must include: incident summary, root cause, corrective documentation, and an attestation statement signed by the agency representative. Tone: formal, factual, regulatory.`;

function buildCallOffPrompt(p: any) {
  return `Caregiver who called off: ${p.caregiverName || "Unknown"}
Reason: ${p.reason}
Client affected: ${p.clientName || "Unknown"}
Shift: ${p.shiftStart}${p.shiftEnd ? ` to ${p.shiftEnd}` : ""}
Service type: ${p.serviceType}
Payer/Program: ${p.payer}
Urgency: ${p.urgency}
Special notes: ${p.notes || "(none)"}

Return a JSON object with these exact keys (each a single string, can include newlines):
- immediate_actions: numbered immediate action steps for the scheduler in the next 15 minutes
- replacement_strategy: how to find/assign a replacement caregiver, including pool prioritization
- client_script: a polite phone script the scheduler reads to the client/family
- caregiver_text: a short SMS to send the replacement caregiver
- axiscare_note: a documentation note suitable to paste into AxisCare
- evv_note: a note explaining the EVV/Authenticare implication and what to log`;
}

function buildEvvPrompt(p: any) {
  return `Exception type: ${p.exceptionType}
Client: ${p.clientName}
Caregiver: ${p.caregiverName}
Scheduled: ${p.scheduledStart} to ${p.scheduledEnd}
Actual: ${p.actualStart || "no clock-in recorded"} to ${p.actualEnd || "no clock-out recorded"}
Payer/Program: ${p.payer || "ARChoices/Medicaid"}
Notes: ${p.notes || "(none)"}

Return a JSON object with these exact keys (each a single string):
- incident_summary: brief factual summary of the EVV exception
- root_cause: probable root cause statement
- corrective_documentation: paragraph for the Authenticare correction record
- attestation: formal attestation language signed "Home Care Network Agency Representative"`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const mode = body.mode === "evv_fix" ? "evv_fix" : "call_off";
    const payload = body.payload || {};

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const system = mode === "evv_fix" ? EVV_SYSTEM : CALL_OFF_SYSTEM;
    const userPrompt = mode === "evv_fix" ? buildEvvPrompt(payload) : buildCallOffPrompt(payload);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please retry shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${txt}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, string> = {};
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    return new Response(JSON.stringify({ mode, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
