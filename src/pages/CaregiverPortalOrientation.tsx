import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Lock } from "lucide-react";
import OrientationRunner from "@/components/orientation/OrientationRunner";
import { PortalShell } from "@/pages/CaregiverPortal";

export default function CaregiverPortalOrientation() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [hasAssignment, setHasAssignment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: cg } = await supabase
        .from("caregivers").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!cg) { setLoading(false); return; }
      setCaregiverId(cg.id);
      const { data: assignments } = await supabase
        .from("lms_assignments")
        .select("id, lms_courses!inner(content_type)")
        .eq("caregiver_id", cg.id)
        .eq("lms_courses.content_type", "orientation")
        .limit(1);
      setHasAssignment(!!assignments && assignments.length > 0);
      setLoading(false);
    })();
  }, [user, authLoading]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/caregiver-training");
  };

  const backButton = (
    <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
      <Link to="/caregiver-training"><ArrowLeft className="w-4 h-4 mr-1" /> My Training</Link>
    </Button>
  );

  if (loading || authLoading) {
    return <PortalShell><Skeleton className="h-96" /></PortalShell>;
  }

  if (!user || !caregiverId) {
    return (
      <PortalShell>
        {backButton}
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold">Sign in to view your orientation</h2>
            <p className="text-muted-foreground text-sm">
              Open your training portal and enter your email to get a secure sign-in link.
            </p>
            <Button asChild><Link to="/caregiver-training">Go to My Training</Link></Button>
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  if (!hasAssignment) {
    return (
      <PortalShell onSignOut={handleSignOut}>
        {backButton}
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold">Orientation not yet assigned</h2>
            <p className="text-muted-foreground text-sm">
              Once your administrator assigns the orientation, it will appear here.
            </p>
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  return (
    <PortalShell onSignOut={handleSignOut}>
      {backButton}
      <OrientationRunner caregiverId={caregiverId} />
    </PortalShell>
  );
}
