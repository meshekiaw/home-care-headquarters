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

      const { data: id, error: rpcErr } = await (supabase.rpc as any)("open_training_session", { p_session_number: n });
      if (rpcErr || !id) {
        const m = rpcErr?.message ?? "";
        if (m.includes("session_not_found")) setError("That training session could not be found.");
        else if (m.includes("not_active_caregiver")) setError("This link is for active caregivers. Your account isn't linked to an active caregiver profile yet.");
        else setError(friendlyError(rpcErr, "We couldn't open that session. Please try again."));
        return;
      }
      navigate(`/my-training/${id}`, { replace: true });
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
