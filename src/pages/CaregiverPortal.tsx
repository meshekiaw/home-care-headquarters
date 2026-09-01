import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, GraduationCap, CheckCircle2, Clock, Download, Award,
  Mail, LogOut, PlayCircle,
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { downloadLmsCertificate } from "@/utils/lmsCertificatePdf";

interface PortalAssignment {
  id: string;
  course_id: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  score: number | null;
  progress_percentage: number;
  certificate_url: string | null;
  lms_courses: {
    id: string;
    title: string;
    description: string | null;
    content_type: string;
    content_url: string | null;
    duration_minutes: number | null;
    category: string | null;
  };
}

function PortalShell({ children, onSignOut }: { children: React.ReactNode; onSignOut?: () => void }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight">Caregiver Training Portal</h1>
              <p className="text-xs text-muted-foreground">Home Care Headquarters</p>
            </div>
          </div>
          {onSignOut && (
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="w-4 h-4 mr-1" /> Sign out
            </Button>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function CaregiverPortal() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [caregiver, setCaregiver] = useState<{ id: string; first_name: string; last_name: string } | null>(null);
  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
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
        .select("id, course_id, status, due_date, completed_at, score, progress_percentage, certificate_url, lms_courses(id, title, description, content_type, content_url, duration_minutes, category)")
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

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/caregiver-training`,
        shouldCreateUser: false,
      },
    });
    setSending(false);
    if (error) {
      toast({ title: "Could not send link", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Check your email", description: "We sent you a secure sign-in link." });
  };

  const downloadCert = async (a: PortalAssignment) => {
    if (a.certificate_url) {
      const { data } = await supabase.storage.from("lms-certificates").createSignedUrl(a.certificate_url, 60);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
        return;
      }
    }
    if (caregiver) {
      await downloadLmsCertificate({
        caregiverName: `${caregiver.first_name} ${caregiver.last_name}`,
        courseTitle: a.lms_courses.title,
        completionDate: a.completed_at ? format(new Date(a.completed_at), "MMMM d, yyyy") : "",
        score: a.score,
      });
    }
  };

  // ---------- Not signed in: email link gate ----------
  if (!authLoading && !user) {
    return (
      <PortalShell>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center space-y-1">
              <Mail className="w-10 h-10 mx-auto text-primary" />
              <h2 className="text-lg font-semibold">Access your training</h2>
              <p className="text-sm text-muted-foreground">
                Enter the email your agency has on file. We'll email you a secure link — no password needed.
              </p>
            </div>
            {sent ? (
              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-center">
                Link sent to <strong>{email}</strong>. Open it on this device to view your courses.
              </div>
            ) : (
              <form onSubmit={sendLink} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="portal-email">Email address</Label>
                  <Input
                    id="portal-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <Button type="submit" className="w-full" loading={sending}>
                  Email me a sign-in link
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  if (authLoading || loading) {
    return (
      <PortalShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </PortalShell>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/caregiver-training";
  };

  if (!caregiver) {
    return (
      <PortalShell onSignOut={handleSignOut}>
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
            <p className="font-medium">No caregiver profile linked to this account</p>
            <p className="text-sm text-muted-foreground">
              Please contact your coordinator so they can link your training record.
            </p>
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  const orientation = assignments.filter((a) => a.lms_courses.content_type === "orientation");
  const inService = assignments.filter((a) => a.lms_courses.content_type !== "orientation");
  const completedCount = assignments.filter((a) => a.status === "completed").length;

  const renderCard = (a: PortalAssignment) => {
    const overdue = a.due_date && a.status !== "completed" && isPast(new Date(a.due_date));
    const daysLeft = a.due_date ? differenceInDays(new Date(a.due_date), new Date()) : null;
    const isOrientation = a.lms_courses.content_type === "orientation";
    return (
      <Card key={a.id} className={overdue ? "border-destructive/40" : ""}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold">{a.lms_courses.title}</h3>
                {a.status === "completed" && (
                  <Badge className="bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Completed
                  </Badge>
                )}
                {a.status === "in_progress" && (
                  <Badge className="bg-warning/10 text-warning border-warning/20">
                    <Clock className="w-3 h-3 mr-1" />In Progress
                  </Badge>
                )}
                {a.status === "pending" && !overdue && <Badge variant="secondary">Not started</Badge>}
                {overdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
              {a.lms_courses.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{a.lms_courses.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {a.lms_courses.content_url && (
                  <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3" />Video</span>
                )}
                {a.lms_courses.duration_minutes && <span>{a.lms_courses.duration_minutes} min</span>}
                {a.due_date && (
                  <span>
                    Due:{" "}
                    <strong className={overdue ? "text-destructive" : "text-foreground"}>
                      {format(new Date(a.due_date), "MMM d, yyyy")}
                    </strong>
                    {daysLeft != null && !overdue && daysLeft <= 7 && ` (${daysLeft}d left)`}
                  </span>
                )}
                {a.score != null && <span>Score: {a.score}%</span>}
              </div>
              {a.status !== "completed" && a.progress_percentage > 0 && (
                <div className="mt-3">
                  <Progress value={a.progress_percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{a.progress_percentage}% complete</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {a.status === "completed" ? (
                <Button size="sm" variant="outline" onClick={() => downloadCert(a)}>
                  <Download className="w-4 h-4 mr-1" /> Certificate
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <Link to={isOrientation ? "/my-orientation" : `/caregiver-training/course/${a.id}`}>
                    {a.status === "in_progress" ? "Continue" : "Start"}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PortalShell onSignOut={handleSignOut}>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Welcome, {caregiver.first_name}</h2>
          <p className="text-muted-foreground">
            {assignments.length === 0
              ? "No training assigned yet."
              : `${completedCount} of ${assignments.length} course(s) completed.`}
          </p>
          {assignments.length > 0 && (
            <Progress
              value={Math.round((completedCount / assignments.length) * 100)}
              className="h-2 mt-3 max-w-sm"
            />
          )}
        </div>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Orientation ({orientation.length})
          </h3>
          {orientation.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No orientation courses assigned.</CardContent></Card>
          ) : (
            orientation.map(renderCard)
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> In-Service Training ({inService.length})
          </h3>
          {inService.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No in-service courses assigned.</CardContent></Card>
          ) : (
            inService.map(renderCard)
          )}
        </section>
      </div>
    </PortalShell>
  );
}
