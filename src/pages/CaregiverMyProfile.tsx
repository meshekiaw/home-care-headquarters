import { useEffect, useState } from "react";
import CaregiverLayout from "@/components/layout/CaregiverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, Mail, MapPin } from "lucide-react";

export default function CaregiverMyProfile() {
  const { user } = useAuth();
  const [caregiver, setCaregiver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("caregivers")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCaregiver(data);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <CaregiverLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </CaregiverLayout>
    );
  }

  if (!caregiver) {
    return (
      <CaregiverLayout>
        <p className="text-muted-foreground text-center py-12">Profile not found.</p>
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout>
      <div className="space-y-6 max-w-2xl">
        <h2 className="text-2xl font-bold">My Profile</h2>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">First Name</Label>
                <p className="font-medium">{caregiver.first_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Name</Label>
                <p className="font-medium">{caregiver.last_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{caregiver.email || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{caregiver.phone || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>
                {[caregiver.address, caregiver.city, caregiver.state, caregiver.zip_code]
                  .filter(Boolean)
                  .join(", ") || "Not provided"}
              </span>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <Badge variant={caregiver.status === "active" ? "default" : "secondary"}>
                  {caregiver.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CaregiverLayout>
  );
}
