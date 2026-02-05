 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { regulation } = await req.json();
     
     if (!regulation) {
       return new Response(
         JSON.stringify({ error: "Regulation data is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       throw new Error("LOVABLE_API_KEY is not configured");
     }
 
     const systemPrompt = `You are an expert in home care compliance and policy writing. You create comprehensive, clear, and actionable policies and procedures that comply with state regulations for home care agencies.
 
 When generating a policy:
 1. Start with a clear policy statement
 2. Include the purpose and scope
 3. Provide detailed procedures with step-by-step instructions
 4. Include responsibilities for different roles
 5. Add any required documentation or forms references
 6. Include review and update procedures
 7. Make it specific to home care operations
 
 Format the output in Markdown with clear sections.`;
 
     const userPrompt = `Generate a comprehensive policy and procedure document for the following state regulation:
 
 State: ${regulation.state}
 Regulation Name: ${regulation.regulation_name}
 Regulation Code: ${regulation.regulation_code || 'N/A'}
 Description: ${regulation.regulation_description || 'No additional description provided'}
 Category: ${regulation.category || 'General'}
 
 Create a detailed, professional policy document that a home care agency can implement to comply with this regulation.`;
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-3-flash-preview",
         messages: [
           { role: "system", content: systemPrompt },
           { role: "user", content: userPrompt },
         ],
       }),
     });
 
     if (!response.ok) {
       if (response.status === 429) {
         return new Response(
           JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
           { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       if (response.status === 402) {
         return new Response(
           JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
           { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       const errorText = await response.text();
       console.error("AI gateway error:", response.status, errorText);
       throw new Error("Failed to generate policy");
     }
 
     const data = await response.json();
     const policyContent = data.choices?.[0]?.message?.content;
 
     if (!policyContent) {
       throw new Error("No policy content generated");
     }
 
     return new Response(
       JSON.stringify({ 
         title: `Policy: ${regulation.regulation_name}`,
         content: policyContent 
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     console.error("Error generating policy:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });