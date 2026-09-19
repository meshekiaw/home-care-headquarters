import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/friendlyError";

/**
 * Shareable per-session entry point: /training/session/:sessionNumber
 * Signed out -> sign in, then straight back here. Signed-in caregivers are
 * forwarded to their own assignment for that session (created if needed).
 */
export default function SessionRedirect() {
  const { sessionNumber } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const target = `/training/session/${sessionNumber}`;

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(target)}`, {
        replace: true,
        state: { from: { pathname: target } },
      });
      return;
    }

    const go = async () => {
      const n = parseInt(sessionNumber ?? "", 10);
      if (!n) { setError("That training link is not valid."); return; }

      const { data: course, error: cErr } = await supabase
        .from("lms_courses")
        .select("id, user_id")
        .eq("session_number", n)
        .maybeSingle();
      if (cErr || !course) { setError("That training session could not be found."); return; }

      const { data: cg } = await supabase
        .from("caregivers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!cg) {
        setError("This link is for caregivers. Your account isn't linked to a caregiver profile yet.");
        return;
      }

      const { data: existing } = await supabase
        .from("lms_assignments")
        .select("id")
        .eq("course_id", course.id)
        .eq("caregiver_id", cg.id)
        .maybeSingle();

      if (existing) {
        navigate(`/my-training/${existing.id}`, { replace: true });
        return;
      }

      const { data: created, error: insErr } = await supabase
        .from("lms_assignments")
        .insert({
          user_id: course.user_id,
          course_id: course.id,
          caregiver_id: cg.id,
          assigned_by: "Shared link",
        } as any)
        .select("id")
        .maybeSingle();

      if (insErr || !created) {
        setError(friendlyError(insErr, "We couldn't open that session. Please try again."));
        return;
      }
      navigate(`/my-training/${created.id}`, { replace: true });
    };

    go();
  }, [authLoading, user, sessionNumber, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <p className="font-medium">{error}</p>
          <Button asChild variant="outline"><Link to="/my-training">Go to my training</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-32" />
        <p className="text-center text-sm text-muted-foreground">Opening your training session…</p>
      </div>
    </div>
  );
}
