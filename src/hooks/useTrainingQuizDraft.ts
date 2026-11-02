import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createResumeTransport, QuizAnswerQueue } from "@/utils/trainingResume";

export function useTrainingQuizDraft(assignmentId: string | undefined, enabled: boolean) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const queueRef = useRef<QuizAnswerQueue | null>(null);
  const beginRef = useRef<(() => Promise<unknown>) | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setAnswers({}); setReady(false); setRestored(false); setStatus("saved");
    queueRef.current = null; beginRef.current = null;
    if (!assignmentId || !enabled) return;
    let cancelled = false;
    const transport = createResumeTransport();
    const init = async () => {
      try {
        const [draft, attempts] = await Promise.all([
          supabase.from("lms_quiz_drafts").select("answers,attempt_count").eq("assignment_id", assignmentId).maybeSingle(),
          supabase.from("lms_quiz_attempts").select("id", { count: "exact", head: true }).eq("assignment_id", assignmentId),
        ]);
        if (draft.error || attempts.error) throw new Error("Couldn't load saved answers");
        if (cancelled) return;
        const attemptCount = attempts.count ?? 0;
        if (draft.data?.attempt_count === attemptCount) {
          setAnswers((draft.data.answers ?? {}) as Record<string, string>);
          setRestored(true);
        }
        beginRef.current = () => transport.rpc("save_training_quiz_draft", {
          p_assignment_id: assignmentId, p_attempt_count: attemptCount,
        });
        queueRef.current = new QuizAnswerQueue((id, answer) => transport.rpc("save_training_quiz_draft", {
          p_assignment_id: assignmentId, p_attempt_count: attemptCount, p_question_id: id, p_answer: answer,
        }));
        setReady(true);
      } catch { if (!cancelled) setStatus("error"); }
    };
    void init();
    const retry = () => {
      const queue = queueRef.current;
      if (!queue?.pending) return;
      setStatus("saving");
      void queue.flush().then(() => { if (!cancelled) setStatus("saved"); })
        .catch(() => { if (!cancelled) setStatus("error"); });
    };
    const interval = window.setInterval(retry, 5000);
    window.addEventListener("online", retry);
    window.addEventListener("pagehide", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      retry(); cancelled = true; window.clearInterval(interval);
      window.removeEventListener("online", retry); window.removeEventListener("pagehide", retry);
      document.removeEventListener("visibilitychange", retry); transport.dispose();
    };
  }, [assignmentId, enabled, reload]);

  const pick = useCallback((id: string, answer: string) => {
    const queue = queueRef.current;
    if (!queue) return;
    setAnswers(previous => ({ ...previous, [id]: answer })); setStatus("saving");
    void queue.pick(id, answer).then(() => setStatus("saved")).catch(() => setStatus("error"));
  }, []);
  const begin = async () => {
    if (!beginRef.current) throw new Error("Please wait for saved answers to load.");
    await beginRef.current();
  };
  const flush = async () => {
    if (!queueRef.current) throw new Error("Saved answers haven't loaded yet.");
    await queueRef.current.flush();
  };
  return { answers, ready, restored, status, pick, begin, flush,
    reset: () => { setAnswers({}); setRestored(false); setReload(value => value + 1); },
    retryLoad: () => setReload(value => value + 1),
  };
}