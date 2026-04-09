import { useEffect, useState } from "react";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationFormFiller } from "@/components/caregivers/ApplicationFormFiller";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

// The PDF template path — stored in public for easy access
const TEMPLATE_PATH = "/templates/HCN_Application.pdf";

export default function CaregiverApplication() {
  const { user } = useAuth();
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [caregiverData, setCaregiverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: caregiver } = await supabase
        .from("caregivers")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (caregiver) {
        setCaregiverId(caregiver.id);
        setCaregiverData(caregiver);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <CaregiverLayout>
        <Skeleton className="h-96" />
      </CaregiverLayout>
    );
  }

  if (!caregiverData) {
    return (
      <CaregiverLayout>
        <div className="max-w-2xl mx-auto mt-12">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle>Profile Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              <p>Your caregiver profile could not be found. Please contact your administrator.</p>
            </CardContent>
          </Card>
        </div>
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout>
      <div className="h-[calc(100vh-3rem)]">
        <ApplicationFormFiller
          fileUrl={TEMPLATE_PATH}
          caregiverId={caregiverId}
          caregiverData={caregiverData}
        />
      </div>
    </CaregiverLayout>
  );
}
