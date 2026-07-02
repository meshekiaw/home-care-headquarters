import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, FileText, Award, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Assignment {
  id: string;
  course_id: string;
  caregiver_id: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  score: number | null;
  progress_percentage: number;
  started_at: string | null;
  lms_courses: {
    id: string;
    title: string;
    description: string | null;
    content_type: string;
    content_body: string | null;
    duration_minutes: number | null;
    passing_score: number | null;
  };
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  points: number;
  sort_order: number;
}

export default function LmsCoursePlayer() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"content" | "quiz" | "result">("content");
  const [contentRead, setContentRead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; results: Record<string, { correct: boolean; correct_answer: string }> } | null>(null);

  const load = useCallback(async () => {
    if (!user || !assignmentId) return;
    setLoading(true);

    const { data: cg } = await supabase
      .from("caregivers").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (!cg) {
      toast({ title: "Caregiver profile not found", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("lms_assignments")
      .select("id, course_id, caregiver_id, status, due_date, completed_at, score, progress_percentage, started_at, lms_courses(id, title, description, content_type, content_body, duration_minutes, passing_score)")
      .eq("id", assignmentId)
      .eq("caregiver_id", cg.id)
      .maybeSingle();

    if (error || !data) {
      toast({ title: "Assignment not found", variant: "destructive" });
      setLoading(false);
      return;
    }
    const a = data as any as Assignment;
    setAssignment(a);

    // Orientation courses route to /my-orientation
    if (a.lms_courses.content_type === "orientation") {
      navigate("/my-orientation", { replace: true });
      return;
    }

    // Mark started
    if (a.status === "pending") {
      await supabase.from("lms_assignments").update({
        status: "in_progress",
        started_at: new Date().toISOString(),
        progress_percentage: 10,
      }).eq("id", a.id);
    }

    // Load questions (if any) via edge function to avoid exposing correct_answer
    const { data: qData, error: qErr } = await supabase.functions.invoke("lms-course-quiz", {
      body: { action: "get_questions", assignment_id: a.id },
    });
    if (!qErr && qData?.questions) {
      setQuestions(qData.questions);
    }

    if (a.status === "completed") {
      setStep("result");
      setResult({ score: a.score ?? 100, passed: true, results: {} });
    }

    setLoading(false);
  }, [user, assignmentId, toast, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleContinueToQuiz = async () => {
    if (!assignment) return;
    setContentRead(true);
    if (questions.length === 0) {
      // No quiz: mark complete directly
      setSubmitting(true);
      const { error } = await supabase.from("lms_assignments").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
        score: 100,
      }).eq("id", assignment.id);
      setSubmitting(false);
      if (error) {
        toast({ title: "Could not mark complete", description: error.message, variant: "destructive" });
        return;
      }
      setResult({ score: 100, passed: true, results: {} });
      setStep("result");
      toast({ title: "Course completed" });
    } else {
      await supabase.from("lms_assignments").update({ progress_percentage: 50 }).eq("id", assignment.id);
      setStep("quiz");
    }
  };

  const handleSubmitQuiz = async () => {
    if (!assignment) return;
    if (Object.keys(answers).length < questions.length) {
      toast({ title: "Please answer every question", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("lms-course-quiz", {
      body: { action: "check_answers", assignment_id: assignment.id, answers },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast({ title: "Quiz submission failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setResult(data);
    setStep("result");
    if (data.passed) {
      toast({ title: `Passed with ${data.score}%`, description: "Great work!" });
    } else {
      toast({ title: `Score: ${data.score}%`, description: `You need ${data.passingScore}% to pass. Review and retry.`, variant: "destructive" });
    }
  };

  const retryQuiz = () => {
    setAnswers({});
    setResult(null);
    setStep("content");
    setContentRead(false);
  };

  if (loading) {
    return (
      <CaregiverLayout>
        <div className="space-y-4 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </CaregiverLayout>
    );
  }

  if (!assignment) {
    return (
      <CaregiverLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">This training assignment could not be loaded.</p>
          <Button asChild variant="outline"><Link to="/my-training"><ArrowLeft className="w-4 h-4 mr-2" />Back to My Training</Link></Button>
        </div>
      </CaregiverLayout>
    );
  }

  const course = assignment.lms_courses;

  return (
    <CaregiverLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/my-training"><ArrowLeft className="w-4 h-4 mr-1" /> Back to My Training</Link>
          </Button>
          {assignment.status === "completed" && (
            <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" />{course.title}</h2>
          {course.description && <p className="text-muted-foreground mt-1">{course.description}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
            {course.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration_minutes} min</span>}
            {assignment.due_date && <span>Due: {format(new Date(assignment.due_date), "MMM d, yyyy")}</span>}
            {questions.length > 0 && <span>{questions.length} quiz questions · pass {course.passing_score ?? 80}%</span>}
          </div>
        </div>

        <Progress value={step === "content" ? 25 : step === "quiz" ? 60 : 100} className="h-2" />

        {step === "content" && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg"><FileText className="w-5 h-5 text-primary" /> Course Content</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: course.content_body || "<p class='text-muted-foreground'>No written content for this course. Please contact your administrator.</p>" }}
              />
              <div className="mt-8 flex justify-end">
                <Button onClick={handleContinueToQuiz} loading={submitting}>
                  {questions.length > 0 ? "Continue to Quiz" : "Mark Complete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "quiz" && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Quiz</CardTitle>
              <p className="text-sm text-muted-foreground">Answer all questions. Passing score: {course.passing_score ?? 80}%.</p>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {questions.map((q, idx) => {
                const opts: string[] = Array.isArray(q.options) ? q.options : [];
                return (
                  <div key={q.id} className="space-y-2">
                    <p className="font-medium">{idx + 1}. {q.question_text}</p>
                    <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}>
                      {opts.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                          <Label htmlFor={`${q.id}-${i}`} className="cursor-pointer font-normal">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                );
              })}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setStep("content")} disabled={submitting}>Back to content</Button>
                <Button onClick={handleSubmitQuiz} loading={submitting}>Submit Quiz</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "result" && result && (
          <Card className={result.passed ? "border-success/40" : "border-destructive/40"}>
            <CardContent className="pt-8 text-center space-y-4">
              {result.passed ? (
                <>
                  <Award className="w-16 h-16 text-success mx-auto" />
                  <h3 className="text-2xl font-bold">Course Completed!</h3>
                  <p className="text-muted-foreground">You scored <strong>{result.score}%</strong>. Your admin has been notified.</p>
                  <Button asChild><Link to="/my-training">Back to My Training</Link></Button>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 text-destructive mx-auto" />
                  <h3 className="text-2xl font-bold">Not Quite There</h3>
                  <p className="text-muted-foreground">You scored <strong>{result.score}%</strong>. You need {course.passing_score ?? 80}% to pass.</p>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" asChild><Link to="/my-training">Back</Link></Button>
                    <Button onClick={retryQuiz}>Review & Retry</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </CaregiverLayout>
  );
}
