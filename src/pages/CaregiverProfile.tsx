import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCaregiverDetails } from "@/hooks/useCaregivers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import CredentialsTab from "@/components/caregivers/CredentialsTab";
import AvailabilityTab from "@/components/caregivers/AvailabilityTab";
import SkillsTab from "@/components/caregivers/SkillsTab";
import CaregiverOverviewTab from "@/components/caregivers/CaregiverOverviewTab";
import UpcomingCalendarTab from "@/components/caregivers/UpcomingCalendarTab";
import {
  ArrowLeft,
  UserCheck,
  Save,
  X,
  Edit,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Navigation,
} from "lucide-react";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "on-leave", label: "On Leave" },
  { value: "inactive", label: "Inactive" },
];

export default function CaregiverProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const {
    caregiver,
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
    refetch,
  } = useCaregiverDetails(id || null);

  const [formData, setFormData] = useState<TablesUpdate<"caregivers">>({});

  useEffect(() => {
    if (caregiver) {
      setFormData({
        first_name: caregiver.first_name,
        last_name: caregiver.last_name,
        email: caregiver.email || "",
        phone: caregiver.phone || "",
        address: caregiver.address || "",
        city: caregiver.city || "",
        state: caregiver.state || "",
        zip_code: caregiver.zip_code || "",
        hourly_rate: caregiver.hourly_rate,
        service_radius_miles: caregiver.service_radius_miles,
        status: caregiver.status,
        specializations: caregiver.specializations || [],
      });
    }
  }, [caregiver]);

  const handleSave = async () => {
    if (!id || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("caregivers")
        .update(formData)
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Caregiver updated successfully" });
      setIsEditing(false);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error updating caregiver",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (caregiver) {
      setFormData({
        first_name: caregiver.first_name,
        last_name: caregiver.last_name,
        email: caregiver.email || "",
        phone: caregiver.phone || "",
        address: caregiver.address || "",
        city: caregiver.city || "",
        state: caregiver.state || "",
        zip_code: caregiver.zip_code || "",
        hourly_rate: caregiver.hourly_rate,
        service_radius_miles: caregiver.service_radius_miles,
        status: caregiver.status,
        specializations: caregiver.specializations || [],
      });
    }
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success";
      case "on-leave":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!caregiver) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <UserCheck className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Caregiver not found</h2>
          <p className="text-muted-foreground mb-4">
            The caregiver you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/caregivers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Caregivers
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/caregivers")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  {caregiver.first_name} {caregiver.last_name}
                </h1>
                <Badge className={getStatusColor(caregiver.status)}>
                  {caregiver.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {expiredCredentials.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {expiredCredentials.length} expired credentials
                  </Badge>
                )}
                {expiringCredentials.length > 0 && (
                  <Badge variant="outline" className="text-xs border-warning text-warning">
                    {expiringCredentials.length} expiring soon
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
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

          <TabsContent value="overview" className="mt-6">
            {isEditing ? (
              <div className="space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={formData.first_name || ""}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, first_name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={formData.last_name || ""}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, last_name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email || ""}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone || ""}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status || "active"}
                        onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Hourly Rate ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate || ""}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            hourly_rate: e.target.value ? parseFloat(e.target.value) : null,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Street Address</Label>
                      <Input
                        value={formData.address || ""}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, address: e.target.value }))
                        }
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={formData.city || ""}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, city: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={formData.state || ""}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, state: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input
                        value={formData.zip_code || ""}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, zip_code: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Service Radius (miles)</Label>
                      <Input
                        type="number"
                        value={formData.service_radius_miles || ""}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            service_radius_miles: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Contact & Location Card */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{caregiver.phone || "Not provided"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{caregiver.email || "Not provided"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Hourly Rate</p>
                          <p className="font-medium">
                            {caregiver.hourly_rate
                              ? `$${caregiver.hourly_rate}/hr`
                              : "Not set"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">
                          {caregiver.address || "Not provided"}
                        </p>
                        {(caregiver.city || caregiver.state || caregiver.zip_code) && (
                          <p className="text-sm text-muted-foreground">
                            {[caregiver.city, caregiver.state, caregiver.zip_code]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Navigation className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Service Radius</p>
                          <p className="font-medium">
                            {caregiver.service_radius_miles
                              ? `${caregiver.service_radius_miles} miles`
                              : "Not set"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Overview Tab Content */}
                <CaregiverOverviewTab
                  caregiver={caregiver}
                  credentials={credentials}
                  skills={skills}
                  availability={availability}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="credentials" className="mt-6">
            <CredentialsTab
              credentials={credentials}
              onAdd={addCredential}
              onUpdate={updateCredential}
              onDelete={deleteCredential}
            />
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            <AvailabilityTab
              availability={availability}
              onSetSlot={setAvailabilitySlot}
              onDeleteSlot={deleteAvailabilitySlot}
            />
          </TabsContent>

          <TabsContent value="skills" className="mt-6">
            <SkillsTab
              skills={skills}
              onAdd={addSkill}
              onUpdate={updateSkill}
              onDelete={deleteSkill}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            {caregiver && id && (
              <UpcomingCalendarTab
                caregiverId={id}
                caregiverName={`${caregiver.first_name} ${caregiver.last_name}`}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
