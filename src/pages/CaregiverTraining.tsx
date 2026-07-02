import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, CheckCircle2, Clock, Download, Award, FileText, AlertTriangle } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { downloadLmsCertificate, generateLmsCertificateBlob } from "@/utils/lmsCertificatePdf";

interface Assignment {
  id: string;
  course_id: string;
  caregiver_id: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  score: number | null;
  progress_percentage: number;
  certificate_url: string | null;
  started_at: string | null;
  lms_courses: {
    id: string;
    title: string;
    description: string | null;
    content_type: string;
    content_body: string | null;
    duration_minutes: number | null;
  };
}

export default function CaregiverTraining() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caregiver, setCaregiver] = useState<{ id: string; first_name: string; last_name: string } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCourse, setActiveCourse] = useState<Assignment | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: cg } = await supabase
      .from("caregivers")
      .select("id, first_name, last_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    setCaregiver(cg);
    if (cg) {
      const { data, error } = await supabase
        .from("lms_assignments")
        .select("id, course_id, caregiver_id, status, due_date, completed_at, score, progress_percentage, certificate_url, started_at, lms_courses(id, title, description, content_type, content_body, duration_minutes)")
        .eq("caregiver_id", cg.id)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) {
        toast({ title: "Error loading training", description: error.message, variant: "destructive" });
      } else {
        setAssignments((data as any) || []);
      }
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const startCourse = async (a: Assignment) => {
    if (a.status === "pending") {
      await supabase.from("lms_assignments").update({
        status: "in_progress",
        started_at: new Date().toISOString(),
        progress_percentage: 10,
      }).eq("id", a.id);
      setAssignments((prev) => prev.map((x) => x.id === a.id ? { ...x, status: "in_progress", progress_percentage: 10 } : x));
    }
    setActiveCourse(a);
  };

  const completeCourse = async (a: Assignment) => {
    if (!caregiver) return;
    setCompleting(true);
    try {
      const completionDate = new Date();
      const fullName = `${caregiver.first_name} ${caregiver.last_name}`;
      const blob = await generateLmsCertificateBlob({
        caregiverName: fullName,
        courseTitle: a.lms_courses.title,
        completionDate: format(completionDate, "MMMM d, yyyy"),
        score: 100,
      });
      const path = `${caregiver.id}/${a.id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("lms-certificates")
        .upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;

      const { error: updErr } = await supabase.from("lms_assignments").update({
        status: "completed",
        completed_at: completionDate.toISOString(),
        progress_percentage: 100,
        score: 100,
        certificate_url: path,
      }).eq("id", a.id);
      if (updErr) throw updErr;

      toast({ title: "Course completed!", description: "Your certificate is ready to download." });
      setActiveCourse(null);
      await load();
    } catch (e: any) {
      toast({ title: "Could not complete course", description: e.message, variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  const downloadCert = async (a: Assignment) => {
    if (!a.certificate_url) return;
    const { data, error } = await supabase.storage
      .from("lms-certificates")
      .createSignedUrl(a.certificate_url, 60);
    if (error || !data) {
      // Fallback: regenerate locally
      if (caregiver) {
        await downloadLmsCertificate({
          caregiverName: `${caregiver.first_name} ${caregiver.last_name}`,
          courseTitle: a.lms_courses.title,
          completionDate: a.completed_at ? format(new Date(a.completed_at), "MMMM d, yyyy") : "",
          score: a.score,
        });
      }
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const pending = assignments.filter((a) => a.status === "pending");
  const inProgress = assignments.filter((a) => a.status === "in_progress");
  const completed = assignments.filter((a) => a.status === "completed");

  if (loading) {
    return (
      <CaregiverLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </CaregiverLayout>
    );
  }

  const renderCard = (a: Assignment) => {
    const overdue = a.due_date && a.status !== "completed" && isPast(new Date(a.due_date));
    const daysLeft = a.due_date ? differenceInDays(new Date(a.due_date), new Date()) : null;
    return (
      <Card key={a.id} className={overdue ? "border-destructive/40" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold">{a.lms_courses.title}</h3>
                {a.status === "completed" && <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>}
                {a.status === "in_progress" && <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>}
                {a.status === "pending" && !overdue && <Badge variant="secondary">Pending</Badge>}
                {overdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
              {a.lms_courses.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{a.lms_courses.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {a.due_date && (
                  <span>Due: <strong className={overdue ? "text-destructive" : "text-foreground"}>{format(new Date(a.due_date), "MMM d, yyyy")}</strong>{daysLeft != null && !overdue && daysLeft <= 7 && ` (${daysLeft}d left)`}</span>
                )}
                {a.lms_courses.duration_minutes && <span>{a.lms_courses.duration_minutes} min</span>}
                {a.completed_at && <span>Completed: {format(new Date(a.completed_at), "MMM d, yyyy")}</span>}
                {a.score != null && <span>Score: {a.score}%</span>}
              </div>
              {a.status !== "completed" && a.progress_percentage > 0 && (
                <div className="mt-3">
                  <Progress value={a.progress_percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{a.progress_percentage}% complete</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {a.status === "completed" ? (
                <Button size="sm" variant="outline" onClick={() => downloadCert(a)}>
                  <Download className="w-4 h-4 mr-1" /> Certificate
                </Button>
              ) : a.lms_courses.content_type === "orientation" ? (
                <Button size="sm" asChild>
                  <Link to="/my-orientation">{a.status === "in_progress" ? "Continue" : "Start"}</Link>
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <Link to={`/my-training/${a.id}`}>{a.status === "in_progress" ? "Continue" : "Start"}</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <CaregiverLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">My Training</h2>
          <p className="text-muted-foreground">Complete your assigned courses to stay compliant.</p>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No training assigned yet. Check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {pending.length + inProgress.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  To Do ({pending.length + inProgress.length})
                </h3>
                {[...inProgress, ...pending].map(renderCard)}
              </section>
            )}

            {completed.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-success" />
                  Completed ({completed.length})
                </h3>
                {completed.map(renderCard)}
              </section>
            )}
          </>
        )}

        {/* Course viewer dialog */}
        {activeCourse && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !completing && setActiveCourse(null)}>
            <Card className="max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {activeCourse.lms_courses.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 overflow-auto flex-1">
                {activeCourse.lms_courses.description && (
                  <p className="text-sm text-muted-foreground mb-4">{activeCourse.lms_courses.description}</p>
                )}
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: activeCourse.lms_courses.content_body || "<p>No content available for this course. Please contact your administrator.</p>" }}
                />
              </CardContent>
              <div className="border-t p-4 flex justify-between items-center gap-2">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Review all content above before marking complete.</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveCourse(null)} disabled={completing}>Close</Button>
                  <Button onClick={() => completeCourse(activeCourse)} loading={completing}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Complete
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </CaregiverLayout>
  );
}
