import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function CaregiverOrientation() {
  const { user } = useAuth();
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [hasAssignment, setHasAssignment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cg } = await supabase
        .from("caregivers").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!cg) { setLoading(false); return; }
      setCaregiverId(cg.id);

      // Gate on an active orientation-type assignment
      const { data: assignments } = await supabase
        .from("lms_assignments")
        .select("id, status, lms_courses!inner(content_type)")
        .eq("caregiver_id", cg.id)
        .eq("lms_courses.content_type", "orientation")
        .limit(1);
      setHasAssignment(!!assignments && assignments.length > 0);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <CaregiverLayout>
        <Skeleton className="h-96" />
      </CaregiverLayout>
    );
  }

  if (!caregiverId) {
    return (
      <CaregiverLayout>
        <p className="text-muted-foreground text-center py-12">
          Your caregiver profile could not be found. Please contact your administrator.
        </p>
      </CaregiverLayout>
    );
  }

  if (!hasAssignment) {
    return (
      <CaregiverLayout>
        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">Orientation not yet assigned</h2>
            <p className="text-muted-foreground">
              Your administrator hasn't assigned the orientation course to you yet. Once it's assigned, it will appear here and in your training list.
            </p>
            <Button asChild variant="outline"><Link to="/my-training">View My Training</Link></Button>
          </CardContent>
        </Card>
      </CaregiverLayout>
    );
  }

  return <OrientationViewerWrapper caregiverId={caregiverId} />;
}

function OrientationViewerWrapper({ caregiverId }: { caregiverId: string }) {
  // We need to render the orientation viewer with the caregiver's ID
  // Since OrientationViewer uses useParams, we redirect to the proper URL
  useEffect(() => {
    // Navigate to the orientation viewer with the caregiver ID
    window.history.replaceState(null, "", `/my-orientation`);
  }, []);

  return <OrientationViewerInner caregiverId={caregiverId} />;
}

// Inline version of orientation viewer for caregiver layout
import CaregiverLayoutInner from "@/components/layout/CaregiverLayout";
import OrientationRunner from "@/components/orientation/OrientationRunner";

function OrientationViewerInner({ caregiverId }: { caregiverId: string }) {
  return (
    <CaregiverLayoutInner>
      <OrientationRunner caregiverId={caregiverId} />
    </CaregiverLayoutInner>
  );
}
