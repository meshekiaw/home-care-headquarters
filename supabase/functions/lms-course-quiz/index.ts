// Edge function: get LMS quiz questions (without answers) and grade submissions.
// Also updates lms_assignments status/score/completed_at on pass.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const { action, assignment_id, answers } = body ?? {};
    if (!action || !assignment_id) return json({ error: "Missing action or assignment_id" }, 400);

    // Verify caregiver owns this assignment
    const { data: assignment, error: aErr } = await admin
      .from("lms_assignments")
      .select("id, course_id, caregiver_id, status, score, caregivers!inner(auth_user_id)")
      .eq("id", assignment_id)
      .maybeSingle();
    if (aErr || !assignment) return json({ error: "Assignment not found" }, 404);
    if ((assignment as any).caregivers?.auth_user_id !== userId) {
      return json({ error: "Forbidden" }, 403);
    }

    if (action === "get_questions") {
      const { data: qs, error } = await admin
        .from("lms_quiz_questions")
        .select("id, question_text, question_type, options, points, sort_order")
        .eq("course_id", assignment.course_id)
        .order("sort_order", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ questions: qs ?? [] });
    }

    if (action === "check_answers") {
      if (!answers || typeof answers !== "object") return json({ error: "Missing answers" }, 400);
      const { data: qs, error } = await admin
        .from("lms_quiz_questions")
        .select("id, correct_answer, points")
        .eq("course_id", assignment.course_id);
      if (error) return json({ error: error.message }, 500);
      if (!qs || qs.length === 0) return json({ error: "No quiz questions for this course" }, 404);

      const total = qs.reduce((s, q) => s + (q.points || 1), 0);
      let earned = 0;
      const results: Record<string, { correct: boolean; correct_answer: string }> = {};
      for (const q of qs) {
        const correct = answers[q.id] === q.correct_answer;
        if (correct) earned += q.points || 1;
        results[q.id] = { correct, correct_answer: q.correct_answer };
      }
      const score = total > 0 ? Math.round((earned / total) * 100) : 0;
      const passingScore = 80;
      const passed = score >= passingScore;

      if (passed) {
        await admin.from("lms_assignments").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          progress_percentage: 100,
          score,
          updated_at: new Date().toISOString(),
        }).eq("id", assignment_id);
      } else {
        await admin.from("lms_assignments").update({
          status: "in_progress",
          score,
          updated_at: new Date().toISOString(),
        }).eq("id", assignment_id);
      }

      return json({ score, passed, passingScore, results });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
