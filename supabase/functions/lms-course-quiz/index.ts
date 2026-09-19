// Edge function: get LMS quiz questions (without answers) and grade submissions.
// Records every attempt in lms_quiz_attempts and completes the assignment on a pass.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const DEFAULT_PASSING_SCORE = 70;

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
      .select("id, user_id, course_id, caregiver_id, status, score, completed_at, caregivers!inner(auth_user_id)")
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

      // Video gate: when this course has a video, the quiz cannot be graded until
      // the caregiver has watched at least VIDEO_GATE_PERCENT of it. Sessions with
      // no video link yet are not gated.
      const VIDEO_GATE_PERCENT = 95;
      const { data: courseMedia } = await admin
        .from("lms_courses")
        .select("content_url")
        .eq("id", assignment.course_id)
        .maybeSingle();
      const { data: sessionVideo } = await admin
        .from("lms_session_videos")
        .select("course_id")
        .eq("course_id", assignment.course_id)
        .maybeSingle();
      const hasVideo = !!sessionVideo || !!courseMedia?.content_url;
      if (hasVideo) {
        const { data: progress } = await admin
          .from("lms_video_progress")
          .select("percent_complete")
          .eq("assignment_id", assignment_id)
          .maybeSingle();
        const watched = progress?.percent_complete ?? 0;
        if (watched < VIDEO_GATE_PERCENT) {
          return json(
            {
              error: `You must watch the training video before taking the quiz. You have watched ${watched}% so far.`,
              watched_percent: watched,
              required_percent: VIDEO_GATE_PERCENT,
            },
            403,
          );
        }
      }



      const { data: course } = await admin
        .from("lms_courses")
        .select("passing_score")
        .eq("id", assignment.course_id)
        .maybeSingle();

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
      const passingScore = course?.passing_score ?? DEFAULT_PASSING_SCORE;
      const passed = score >= passingScore;

      // Every attempt is retained, pass or fail.
      const { count } = await admin
        .from("lms_quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("assignment_id", assignment_id);
      const attemptNumber = (count ?? 0) + 1;
      const attemptedAt = new Date().toISOString();

      await admin.from("lms_quiz_attempts").insert({
        user_id: assignment.user_id,
        assignment_id,
        course_id: assignment.course_id,
        caregiver_id: assignment.caregiver_id,
        attempt_number: attemptNumber,
        score,
        passing_score: passingScore,
        passed,
        answers,
        attempted_at: attemptedAt,
      });

      if (passed) {
        await admin.from("lms_assignments").update({
          status: "completed",
          // Completion timestamp is the moment of the passing attempt; an earlier
          // pass is never overwritten by a later retake.
          completed_at: assignment.completed_at ?? attemptedAt,
          progress_percentage: 100,
          score,
          attempts: attemptNumber,
          updated_at: new Date().toISOString(),
        }).eq("id", assignment_id);
      } else {
        await admin.from("lms_assignments").update({
          status: assignment.status === "completed" ? "completed" : "in_progress",
          score: assignment.status === "completed" ? assignment.score : score,
          attempts: attemptNumber,
          updated_at: new Date().toISOString(),
        }).eq("id", assignment_id);
      }

      return json({ score, passed, passingScore, attemptNumber, results });
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
