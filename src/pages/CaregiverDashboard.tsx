import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, User, MessageSquare, CheckCircle2, Clock, GraduationCap, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const [caregiver, setCaregiver] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [training, setTraining] = useState<{ pending: number; in_progress: number; completed: number; overdue: number }>({ pending: 0, in_progress: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get caregiver record linked to this auth user
      const { data: cg } = await supabase
        .from("caregivers")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      setCaregiver(cg);

      if (cg) {
        const { data: prog } = await supabase
          .from("orientation_progress")
          .select("*")
          .eq("caregiver_id", cg.id)
          .maybeSingle();
        setProgress(prog);

        const { data: trAssignments } = await supabase
          .from("lms_assignments")
          .select("status, due_date")
          .eq("caregiver_id", cg.id);
        const now = new Date();
        const t = { pending: 0, in_progress: 0, completed: 0, overdue: 0 };
        (trAssignments || []).forEach((a: any) => {
          if (a.status === "completed") t.completed++;
          else if (a.status === "in_progress") t.in_progress++;
          else t.pending++;
          if (a.status !== "completed" && a.due_date && new Date(a.due_date) < now) t.overdue++;
        });
        setTraining(t);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <CaregiverLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted rounded-lg" />)}
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  const orientationComplete = !!progress?.confirmed_at;
  const sectionsCompleted = (progress?.sections_completed as number[])?.length || 0;

  return (
    <CaregiverLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            Welcome{caregiver ? `, ${caregiver.first_name}` : ""}!
          </h2>
          <p className="text-muted-foreground">Here's an overview of your tasks and progress.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Orientation Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Orientation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orientationComplete ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                  </Badge>
                </div>
              ) : sectionsCompleted > 0 ? (
                <div className="space-y-2">
                  <Badge className="bg-warning/10 text-warning border-warning/20">
                    <Clock className="w-3 h-3 mr-1" /> In Progress
                  </Badge>
                  <p className="text-sm text-muted-foreground">{sectionsCompleted} sections completed</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not started yet</p>
              )}
              <Button asChild size="sm" className="mt-3 w-full">
                <Link to="/my-orientation">
                  {orientationComplete ? "Review Orientation" : "Continue Orientation"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                My Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {caregiver?.email || "No email on file"}
              </p>
              <p className="text-sm text-muted-foreground">
                {caregiver?.phone || "No phone on file"}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                <Link to="/my-profile">View Profile</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Communications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Communications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View messages from the office.</p>
              <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                <Link to="/my-communications">Open Messages</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Training Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              My Training
              {training.overdue > 0 && (
                <Badge variant="destructive" className="ml-2">{training.overdue} overdue</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted/40">
                <p className="text-2xl font-bold">{training.pending}</p>
                <p className="text-xs text-muted-foreground">Assigned</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-warning/10">
                <p className="text-2xl font-bold text-warning">{training.in_progress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-success/10">
                <p className="text-2xl font-bold text-success flex items-center justify-center gap-1">
                  <Award className="w-5 h-5" />{training.completed}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
            <Button asChild size="sm" className="w-full">
              <Link to="/my-training">View My Training</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </CaregiverLayout>
  );
}
