import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Building2,
  Save
} from "lucide-react";
 import { StateRegulationsSection } from "@/components/settings/StateRegulationsSection";
 import { NotificationPreferencesSection } from "@/components/settings/NotificationPreferencesSection";
 import { AgencyCredentialsSection } from "@/components/settings/AgencyCredentialsSection";
 import { UserManagementSection } from "@/components/settings/UserManagementSection";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Manage your account and agency preferences</p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Profile</CardTitle>
            </div>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="john@agency.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value="Director of Operations" disabled />
              </div>
            </div>
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Agency Settings */}
        {/* State Regulations & Policies */}
        <StateRegulationsSection />
         
         {/* Notification Preferences */}
         <NotificationPreferencesSection />
 
         {/* Agency Credentials */}
         <AgencyCredentialsSection />
 
         <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Agency</CardTitle>
            </div>
            <CardDescription>Manage agency-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Agency Name</Label>
                <Input placeholder="Your Home Care Agency" />
              </div>
              <div className="space-y-2">
                <Label>Business Phone</Label>
                <Input type="tel" placeholder="(555) 000-0000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Address</Label>
              <Input placeholder="123 Main St, City, State 12345" />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Security</CardTitle>
            </div>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-muted-foreground">Update your password regularly</p>
              </div>
              <Button variant="outline">Change</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline">Enable</Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Subscription</CardTitle>
            </div>
            <CardDescription>Manage your billing and subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div>
                <p className="font-semibold">Professional Plan</p>
                <p className="text-sm text-muted-foreground">Up to 200 caregivers</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">$299/mo</p>
                <Button variant="outline" size="sm" className="mt-2">Manage</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
