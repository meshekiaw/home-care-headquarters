import { useEffect, useState } from "react";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationFormFiller } from "@/components/caregivers/ApplicationFormFiller";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload } from "lucide-react";

export default function CaregiverApplication() {
  const { user } = useAuth();
  const [caregiverId, setCaregiverId] = useState<string | null>(null);
  const [caregiverData, setCaregiverData] = useState<any>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Get caregiver record linked to this auth user
      const { data: caregiver } = await supabase
        .from("caregivers")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (caregiver) {
        setCaregiverId(caregiver.id);
        setCaregiverData(caregiver);
      }

      // Check for application template PDF in storage
      const { data: files } = await supabase.storage
        .from("client-documents")
        .list("application-templates", { limit: 1 });

      if (files && files.length > 0) {
        const { data: urlData } = supabase.storage
          .from("client-documents")
          .getPublicUrl(`application-templates/${files[0].name}`);
        setTemplateUrl(urlData.publicUrl);
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

  if (!templateUrl) {
    return (
      <CaregiverLayout>
        <div className="max-w-2xl mx-auto mt-12">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle>Application Not Available Yet</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              <p>The application form has not been uploaded by your administrator yet.</p>
              <p className="mt-2">Please check back later or contact your supervisor.</p>
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
          fileUrl={templateUrl}
          caregiverId={caregiverId}
          caregiverData={caregiverData}
        />
      </div>
    </CaregiverLayout>
  );
}
