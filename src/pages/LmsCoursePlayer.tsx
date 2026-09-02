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
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, FileText, Award, XCircle, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import LegalFooter from "@/components/layout/LegalFooter";

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
    content_url: string | null;
    duration_minutes: number | null;
    passing_score: number | null;
  };
}

function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?enablejsapi=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function CourseVideo({ url, onEnded }: { url: string; onEnded?: () => void }) {
  const embed = embedUrl(url);

  useEffect(() => {
    if (!embed || !onEnded) return;
    const handler = (e: MessageEvent) => {
      const origin = e.origin || "";
      if (!/youtube\.com|vimeo\.com/.test(origin)) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube: info.playerState === 0 (ended). Vimeo: event === "ended"
        if (data?.event === "ended") onEnded();
        if (data?.info?.playerState === 0) onEnded();
      } catch {
        /* non-JSON message, ignore */
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [embed, onEnded]);

  return (
    <div className="-mx-8 sm:mx-0 w-[calc(100%+4rem)] sm:w-full mb-6 sm:rounded-lg overflow-hidden border-y sm:border bg-black aspect-video">
      {embed ? (
        <iframe
          src={embed}
          title="Course video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video src={url} controls playsInline className="w-full h-full" onEnded={onEnded} />
      )}
    </div>
  );
}


interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  points: number;
  sort_order: number;
}

interface SiblingAssignment {
  id: string;
  status: string;
  title: string;
  content_type: string;
}


export default function LmsCoursePlayer({ standalone = false }: { standalone?: boolean }) {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const backPath = standalone ? "/caregiver-training" : "/my-training";
  const backLabel = standalone ? "Back to My Courses" : "Back to My Training";
  const Shell = ({ children }: { children: React.ReactNode }) =>
    standalone ? (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-card sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold leading-tight text-sm sm:text-base truncate">Caregiver Training Portal</h1>
              <p className="text-xs text-muted-foreground truncate">Home Care Headquarters</p>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">{children}</main>
        <LegalFooter className="bg-card" />
      </div>
    ) : (
      <CaregiverLayout>{children}</CaregiverLayout>
    );
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"content" | "quiz" | "result">("content");
  const [contentRead, setContentRead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; results: Record<string, { correct: boolean; correct_answer: string }> } | null>(null);
  const [siblings, setSiblings] = useState<SiblingAssignment[]>([]);
  const [videoEnded, setVideoEnded] = useState(false);


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
      .select("id, course_id, caregiver_id, status, due_date, completed_at, score, progress_percentage, started_at, lms_courses(id, title, description, content_type, content_body, content_url, duration_minutes, passing_score)")
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

    // Load the caregiver's full assigned course list (for progress + next/jump)
    const { data: all } = await supabase
      .from("lms_assignments")
      .select("id, status, lms_courses(title, content_type)")
      .eq("caregiver_id", cg.id)
      .order("due_date", { ascending: true, nullsFirst: false });
    setSiblings(
      ((all as any[]) || []).map((r) => ({
        id: r.id,
        status: r.status,
        title: r.lms_courses?.title ?? "Course",
        content_type: r.lms_courses?.content_type ?? "text",
      }))
    );

    setLoading(false);

  }, [user, assignmentId, toast, navigate]);

  useEffect(() => { load(); }, [load]);

  // Reset player state when navigating to a different course
  useEffect(() => {
    setStep("content");
    setResult(null);
    setAnswers({});
    setVideoEnded(false);
    setContentRead(false);
  }, [assignmentId]);

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

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-12 space-y-3">
          <p className="font-medium">Sign in to view this course</p>
          <p className="text-sm text-muted-foreground">
            Enter your email on the training portal and we'll send you a secure link.
          </p>
          <Button asChild><Link to="/caregiver-training">Go to training portal</Link></Button>
        </div>
      </Shell>
    );
  }

  if (loading || authLoading) {

    return (
      <Shell>
        <div className="space-y-4 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </Shell>
    );
  }

  if (!assignment) {
    return (
      <Shell>
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">This training assignment could not be loaded.</p>
          <Button asChild variant="outline"><Link to={backPath}><ArrowLeft className="w-4 h-4 mr-2" />{backLabel}</Link></Button>
        </div>
      </Shell>
    );
  }

  const course = assignment.lms_courses;

  const coursePath = (s: SiblingAssignment) =>
    s.content_type === "orientation"
      ? "/my-orientation"
      : `${standalone ? "/caregiver-training" : "/my-training"}/course/${s.id}`;

  const currentIndex = siblings.findIndex((s) => s.id === assignment.id);
  const nextCourse =
    siblings.slice(currentIndex + 1).find((s) => s.status !== "completed") ||
    siblings.find((s) => s.id !== assignment.id && s.status !== "completed") ||
    null;
  const totalCourses = siblings.length;
  const completedCourses = siblings.filter(
    (s) => s.status === "completed" || (s.id === assignment.id && result?.passed)
  ).length;

  const goNext = () => {
    if (!nextCourse) return;
    setStep("content");
    setResult(null);
    setAnswers({});
    setQuestions([]);
    setVideoEnded(false);
    setContentRead(false);
    navigate(coursePath(nextCourse));
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={backPath}><ArrowLeft className="w-4 h-4 mr-1" /> {backLabel}</Link>
          </Button>
          {assignment.status === "completed" && (
            <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
          )}
        </div>

        {totalCourses > 0 && (
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Your training progress</span>
                <span className="text-muted-foreground">
                  {completedCourses} of {totalCourses} courses completed
                </span>
              </div>
              <Progress value={Math.round((completedCourses / totalCourses) * 100)} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-start gap-2"><BookOpen className="w-6 h-6 text-primary shrink-0 mt-0.5" /><span className="min-w-0 break-words">{course.title}</span></h2>
          {course.description && <p className="text-sm sm:text-base text-muted-foreground mt-1">{course.description}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
            {course.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration_minutes} min</span>}
            {assignment.due_date && <span>Due: {format(new Date(assignment.due_date), "MMM d, yyyy")}</span>}
            {questions.length > 0 && <span>{questions.length} quiz questions · pass {course.passing_score ?? 80}%</span>}
          </div>
        </div>

        <Progress value={step === "content" ? 25 : step === "quiz" ? 60 : 100} className="h-2" />

        {step === "content" && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><FileText className="w-5 h-5 text-primary" /> Course Content</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 px-4 sm:px-6">
              {course.content_url && <CourseVideo url={course.content_url} onEnded={() => setVideoEnded(true)} />}
              {videoEnded && (
                <div className="mb-6 rounded-lg border bg-muted/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" /> Video finished
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button className="h-11 w-full sm:w-auto sm:h-9" onClick={handleContinueToQuiz} loading={submitting}>
                      {questions.length > 0 ? "Continue to Quiz" : "Mark Complete"}
                    </Button>
                    {nextCourse && (
                      <Button className="h-11 w-full sm:w-auto sm:h-9" variant="outline" onClick={goNext}>
                        Next Course <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div
                className="prose prose-sm max-w-none dark:prose-invert break-words"
                dangerouslySetInnerHTML={{ __html: course.content_body || "<p class='text-muted-foreground'>No written content for this course. Please contact your administrator.</p>" }}
              />
              <div className="mt-8 flex justify-end">
                <Button className="h-11 w-full sm:w-auto sm:h-10" onClick={handleContinueToQuiz} loading={submitting}>
                  {questions.length > 0 ? "Continue to Quiz" : "Mark Complete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {step === "quiz" && (
          <Card>
            <CardHeader className="border-b px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Quiz</CardTitle>
              <p className="text-sm text-muted-foreground">Answer all questions. Passing score: {course.passing_score ?? 80}%.</p>
            </CardHeader>
            <CardContent className="pt-6 px-4 sm:px-6 space-y-6">
              {questions.map((q, idx) => {
                const opts: string[] = Array.isArray(q.options) ? q.options : [];
                return (
                  <div key={q.id} className="space-y-2">
                    <p className="font-medium text-base">{idx + 1}. {q.question_text}</p>
                    <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}>
                      {opts.map((opt, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                          <RadioGroupItem value={opt} id={`${q.id}-${i}`} className="mt-0.5" />
                          <Label htmlFor={`${q.id}-${i}`} className="cursor-pointer font-normal text-base leading-snug flex-1">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                );
              })}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4 border-t">
                <Button className="h-11 w-full sm:w-auto sm:h-10" variant="outline" onClick={() => setStep("content")} disabled={submitting}>Back to content</Button>
                <Button className="h-11 w-full sm:w-auto sm:h-10" onClick={handleSubmitQuiz} loading={submitting}>Submit Quiz</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "result" && result && (
          <Card className={result.passed ? "border-success/40" : "border-destructive/40"}>
            <CardContent className="pt-8 px-4 sm:px-6 text-center space-y-4">
              {result.passed ? (
                <>
                  <Award className="w-14 h-14 sm:w-16 sm:h-16 text-success mx-auto" />
                  <h3 className="text-xl sm:text-2xl font-bold">Course Completed!</h3>
                  <p className="text-muted-foreground">You scored <strong>{result.score}%</strong>. Your admin has been notified.</p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-2">
                    {nextCourse ? (
                      <>
                        <Button className="h-11 w-full sm:w-auto sm:h-10" onClick={goNext}>
                          <span className="truncate">Next Course: {nextCourse.title}</span> <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
                        </Button>
                        <Button className="h-11 w-full sm:w-auto sm:h-10" variant="outline" asChild><Link to={backPath}>{backLabel}</Link></Button>
                      </>
                    ) : (
                      <Button className="h-11 w-full sm:w-auto sm:h-10" asChild><Link to={backPath}>{backLabel}</Link></Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-14 h-14 sm:w-16 sm:h-16 text-destructive mx-auto" />
                  <h3 className="text-xl sm:text-2xl font-bold">Not Quite There</h3>
                  <p className="text-muted-foreground">You scored <strong>{result.score}%</strong>. You need {course.passing_score ?? 80}% to pass.</p>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
                    <Button className="h-11 w-full sm:w-auto sm:h-10" variant="outline" asChild><Link to={backPath}>Back</Link></Button>
                    <Button className="h-11 w-full sm:w-auto sm:h-10" onClick={retryQuiz}>Review & Retry</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}


        {siblings.length > 1 && (
          <Card>
            <CardHeader className="border-b px-4 sm:px-6">
              <CardTitle className="text-base">All your courses</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 px-4 sm:px-6 divide-y">
              {siblings.map((s, i) => {
                const isCurrent = s.id === assignment.id;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {s.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-sm truncate ${isCurrent ? "font-semibold" : ""}`}>
                        {i + 1}. {s.title}
                      </span>
                    </div>
                    {isCurrent ? (
                      <Badge variant="secondary" className="shrink-0">Current</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" asChild className="shrink-0 h-10 px-3">
                        <Link to={coursePath(s)}>{s.status === "completed" ? "Review" : "Open"}</Link>
                      </Button>
                    )}
                  </div>
                );
              })}

            </CardContent>
          </Card>
        )}
      </div>

    </Shell>
  );
}
