import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck } from "lucide-react";
import { useCaregiverDetails } from "@/hooks/useCaregivers";
import type { Tables } from "@/integrations/supabase/types";
import CredentialsTab from "./CredentialsTab";
import AvailabilityTab from "./AvailabilityTab";
import SkillsTab from "./SkillsTab";
import CaregiverOverviewTab from "./CaregiverOverviewTab";

interface CaregiverProfileDialogProps {
  caregiver: Tables<"caregivers"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export default function CaregiverProfileDialog({
  caregiver,
  open,
  onOpenChange,
  onUpdate,
}: CaregiverProfileDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    credentials,
    availability,
    skills,
    loading,
    addCredential,
    updateCredential,
    deleteCredential,
    setAvailabilitySlot,
    deleteAvailabilitySlot,
    addSkill,
    updateSkill,
    deleteSkill,
  } = useCaregiverDetails(caregiver?.id || null);

  if (!caregiver) return null;

  const expiringCredentials = credentials.filter((c) => {
    if (!c.expiry_date) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  const expiredCredentials = credentials.filter((c) => {
    if (!c.expiry_date) return false;
    return new Date(c.expiry_date) < new Date();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-7 h-7 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {caregiver.first_name} {caregiver.last_name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={caregiver.status === "active" ? "default" : "secondary"}>
                  {caregiver.status}
                </Badge>
                {expiredCredentials.length > 0 && (
                  <Badge variant="destructive">{expiredCredentials.length} expired</Badge>
                )}
                {expiringCredentials.length > 0 && (
                  <Badge variant="outline" className="border-warning text-warning">
                    {expiringCredentials.length} expiring soon
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="credentials">
                Credentials
                {credentials.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {credentials.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="skills">
                Skills
                {skills.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {skills.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <CaregiverOverviewTab
                caregiver={caregiver}
                credentials={credentials}
                skills={skills}
                availability={availability}
              />
            </TabsContent>

            <TabsContent value="credentials" className="mt-4">
              <CredentialsTab
                credentials={credentials}
                onAdd={addCredential}
                onUpdate={updateCredential}
                onDelete={deleteCredential}
              />
            </TabsContent>

            <TabsContent value="availability" className="mt-4">
              <AvailabilityTab
                availability={availability}
                onSetSlot={setAvailabilitySlot}
                onDeleteSlot={deleteAvailabilitySlot}
              />
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <SkillsTab
                skills={skills}
                onAdd={addSkill}
                onUpdate={updateSkill}
                onDelete={deleteSkill}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
