import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { section_number, answers } = await req.json();
    if (!section_number || !answers || typeof answers !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing required fields: section_number, answers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to read correct answers
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: questions, error: qError } = await adminClient
      .from("orientation_quizzes")
      .select("id, correct_answer, points")
      .eq("section_number", section_number);

    if (qError) {
      return new Response(JSON.stringify({ error: qError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No questions found for this section" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Grade
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    let earnedPoints = 0;
    const results: Record<string, { correct: boolean; correct_answer: string }> = {};

    for (const q of questions) {
      const isCorrect = answers[q.id] === q.correct_answer;
      if (isCorrect) earnedPoints += q.points;
      results[q.id] = { correct: isCorrect, correct_answer: q.correct_answer };
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passingScore = 80;
    const passed = score >= passingScore;

    return new Response(
      JSON.stringify({ score, passed, passingScore, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
