import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { History, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import { useQuizResetStatus } from "@/hooks/useQuizResetStatus";
import { isBeforeReset, resetConfirmText, type QuizAttemptRow, type QuizResetLogRow, type QuizResetStatus } from "@/utils/quizReset";

interface Props { caregiverId: string; caregiverName: string }

const when = (iso: string) => format(new Date(iso), "MM/dd/yyyy h:mm a");

export default function QuizResetSection({ caregiverId, caregiverName }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const status = useQuizResetStatus(true, caregiverId);
  const history = useQuery({
    queryKey: ["quiz-reset-history", caregiverId],
    staleTime: 0,
    queryFn: async () => {
      const [attempts, resets] = await Promise.all([
        supabase.from("lms_quiz_attempts").select("id, assignment_id, attempt_number, score, passing_score, passed, attempted_at")
          .eq("caregiver_id", caregiverId).order("attempted_at", { ascending: true }),
        supabase.from("lms_quiz_resets").select("id, assignment_id, caregiver_id, course_id, reset_by_name, attempts_before, failed_attempts_before, created_at")
          .eq("caregiver_id", caregiverId).order("created_at", { ascending: false }),
      ]);
      if (attempts.error) throw attempts.error;
      if (resets.error) throw resets.error;
      return { attempts: (attempts.data ?? []) as QuizAttemptRow[], resets: (resets.data ?? []) as QuizResetLogRow[] };
    },
  });
  const [target, setTarget] = useState<QuizResetStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const sessions = status.data ?? [];
  const attempts = history.data?.attempts ?? [];
  const resets = history.data?.resets ?? [];
  const titleFor = (assignmentId: string) => sessions.find((s) => s.assignment_id === assignmentId)?.session_title ?? "Session";

  const confirm = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("reset_training_quiz", { p_assignment_id: target.assignment_id });
      if (error) throw error;
      toast({ title: "Quiz reset", description: `${caregiverName} can take the ${target.session_title} quiz again.` });
      setTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quiz-reset-status"] }),
        queryClient.invalidateQueries({ queryKey: ["quiz-reset-history", caregiverId] }),
      ]);
    } catch (err) {
      toast({ title: "Quiz was not reset", description: friendlyError(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const loading = status.isLoading || history.isLoading;
  const failed = status.isError || history.isError;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Session quizzes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p role="status" className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading quiz attempts…</p>
        ) : failed ? (
          <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
            Couldn't load quiz attempts.
            <Button variant="outline" size="sm" onClick={() => { void status.refetch(); void history.refetch(); }}>Retry</Button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => {
              const rows = attempts.filter((a) => a.assignment_id === s.assignment_id);
              return (
                <li key={s.assignment_id} className="py-3 space-y-2" data-testid={`quiz-session-${s.assignment_id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium break-words">{s.session_number ? `${s.session_number}. ` : ""}{s.session_title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>Failed attempts: <strong className={s.needs_reset ? "text-destructive" : "text-foreground"}>{s.failed_since_reset}</strong></span>
                        {s.max_attempts && <span>· {Math.min(s.attempts_since_reset, s.max_attempts)} of {s.max_attempts} attempts used</span>}
                        {s.assignment_status === "completed" && <Badge variant="secondary">Passed</Badge>}
                        {s.needs_reset && <Badge variant="destructive">Locked out</Badge>}
                      </div>
                    </div>
                    {s.needs_reset && (
                      <Button className="h-11 sm:h-9 w-full sm:w-auto" variant="outline" onClick={() => setTarget(s)}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset quiz
                      </Button>
                    )}
                  </div>
                  {rows.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {rows.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground">Attempt {a.attempt_number}</span>
                          <span className="font-medium">{a.score}%</span>
                          <span className={a.passed ? "text-success" : "text-destructive"}>{a.passed ? "Passed" : "Failed"}</span>
                          <span className="text-muted-foreground">{when(a.attempted_at)}</span>
                          {isBeforeReset(a, resets) && <Badge variant="outline">Before reset</Badge>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2"><History className="w-4 h-4" /> Quiz reset log</p>
          {!loading && !failed && resets.length === 0 && <p className="text-sm text-muted-foreground">No quiz resets.</p>}
          {resets.length > 0 && (
            <ul className="space-y-1 text-sm">
              {resets.map((r) => (
                <li key={r.id} className="break-words">
                  <span className="text-muted-foreground">{when(r.created_at)}</span> · {r.reset_by_name} reset the {titleFor(r.assignment_id)} quiz for {caregiverName} ({r.failed_attempts_before} failed attempt{r.failed_attempts_before === 1 ? "" : "s"} before reset)
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && !saving && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset quiz?</AlertDialogTitle>
            <AlertDialogDescription>{target ? resetConfirmText(target.session_title, caregiverName) : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void confirm(); }} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reset quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
