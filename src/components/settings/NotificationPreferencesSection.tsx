 import { useState, useEffect } from "react";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Switch } from "@/components/ui/switch";
 import { Label } from "@/components/ui/label";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Bell, Mail, Phone, Save, Loader2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";
 
 interface NotificationPreferences {
   id?: string;
   email_enabled: boolean;
   sms_enabled: boolean;
   assessment_expiry_alerts: boolean;
   handoff_alerts: boolean;
   days_before_expiry: number;
 }
 
 const defaultPreferences: NotificationPreferences = {
   email_enabled: true,
   sms_enabled: true,
   assessment_expiry_alerts: true,
   handoff_alerts: true,
   days_before_expiry: 30,
 };
 
 export function NotificationPreferencesSection() {
   const { toast } = useToast();
   const { user } = useAuth();
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
 
   useEffect(() => {
     if (user) {
       fetchPreferences();
     }
   }, [user]);
 
   async function fetchPreferences() {
     try {
       const { data, error } = await supabase
         .from("notification_preferences")
         .select("*")
         .is("nurse_id", null)
         .maybeSingle();
 
       if (error) throw error;
 
       if (data) {
         setPreferences({
           id: data.id,
           email_enabled: data.email_enabled,
           sms_enabled: data.sms_enabled,
           assessment_expiry_alerts: data.assessment_expiry_alerts,
           handoff_alerts: data.handoff_alerts,
           days_before_expiry: data.days_before_expiry,
         });
       }
     } catch (error: any) {
       console.error("Error fetching preferences:", error);
     } finally {
       setLoading(false);
     }
   }
 
   async function handleSave() {
     if (!user) return;
     setSaving(true);
 
     try {
       if (preferences.id) {
         const { error } = await supabase
           .from("notification_preferences")
           .update({
             email_enabled: preferences.email_enabled,
             sms_enabled: preferences.sms_enabled,
             assessment_expiry_alerts: preferences.assessment_expiry_alerts,
             handoff_alerts: preferences.handoff_alerts,
             days_before_expiry: preferences.days_before_expiry,
           })
           .eq("id", preferences.id);
 
         if (error) throw error;
       } else {
         const { data, error } = await supabase
           .from("notification_preferences")
           .insert({
             user_id: user.id,
             email_enabled: preferences.email_enabled,
             sms_enabled: preferences.sms_enabled,
             assessment_expiry_alerts: preferences.assessment_expiry_alerts,
             handoff_alerts: preferences.handoff_alerts,
             days_before_expiry: preferences.days_before_expiry,
           })
           .select()
           .single();
 
         if (error) throw error;
         if (data) setPreferences((prev) => ({ ...prev, id: data.id }));
       }
 
       toast({
         title: "Preferences saved",
         description: "Your notification preferences have been updated.",
       });
     } catch (error: any) {
       toast({
         title: "Error saving preferences",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   }
 
   if (loading) {
     return (
       <Card>
         <CardContent className="flex items-center justify-center py-8">
           <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card>
       <CardHeader>
         <div className="flex items-center gap-2">
           <Bell className="w-5 h-5 text-primary" />
           <CardTitle className="text-lg">Notification Preferences</CardTitle>
         </div>
         <CardDescription>
           Configure how and when notifications are sent to nurses
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-6">
         {/* Delivery Channels */}
         <div className="space-y-4">
           <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
             Delivery Channels
           </h4>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Mail className="w-4 h-4 text-muted-foreground" />
               <div>
                 <p className="font-medium">Email Notifications</p>
                 <p className="text-sm text-muted-foreground">
                   Send alerts via email to nurses
                 </p>
               </div>
             </div>
             <Switch
               checked={preferences.email_enabled}
               onCheckedChange={(checked) =>
                 setPreferences((prev) => ({ ...prev, email_enabled: checked }))
               }
             />
           </div>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Phone className="w-4 h-4 text-muted-foreground" />
               <div>
                 <p className="font-medium">SMS Notifications</p>
                 <p className="text-sm text-muted-foreground">
                   Send alerts via text message
                 </p>
               </div>
             </div>
             <Switch
               checked={preferences.sms_enabled}
               onCheckedChange={(checked) =>
                 setPreferences((prev) => ({ ...prev, sms_enabled: checked }))
               }
             />
           </div>
         </div>
 
         {/* Alert Types */}
         <div className="space-y-4">
           <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
             Alert Types
           </h4>
           <div className="flex items-center justify-between">
             <div>
               <p className="font-medium">Assessment Expiry Alerts</p>
               <p className="text-sm text-muted-foreground">
                 Notify nurses about upcoming assessment due dates
               </p>
             </div>
             <Switch
               checked={preferences.assessment_expiry_alerts}
               onCheckedChange={(checked) =>
                 setPreferences((prev) => ({
                   ...prev,
                   assessment_expiry_alerts: checked,
                 }))
               }
             />
           </div>
           <div className="flex items-center justify-between">
             <div>
               <p className="font-medium">Handoff Queue Alerts</p>
               <p className="text-sm text-muted-foreground">
                 Notify when assessments are released for pickup
               </p>
             </div>
             <Switch
               checked={preferences.handoff_alerts}
               onCheckedChange={(checked) =>
                 setPreferences((prev) => ({ ...prev, handoff_alerts: checked }))
               }
             />
           </div>
         </div>
 
         {/* Timing */}
         <div className="space-y-4">
           <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
             Timing
           </h4>
           <div className="flex items-center justify-between">
             <div>
               <Label htmlFor="days-before">Days Before Expiry</Label>
               <p className="text-sm text-muted-foreground">
                 Start sending alerts this many days before due date
               </p>
             </div>
             <Input
               id="days-before"
               type="number"
               min={1}
               max={90}
               className="w-20"
               value={preferences.days_before_expiry}
               onChange={(e) =>
                 setPreferences((prev) => ({
                   ...prev,
                   days_before_expiry: parseInt(e.target.value) || 30,
                 }))
               }
             />
           </div>
         </div>
 
         <Button onClick={handleSave} disabled={saving}>
           {saving ? (
             <Loader2 className="w-4 h-4 mr-2 animate-spin" />
           ) : (
             <Save className="w-4 h-4 mr-2" />
           )}
           Save Preferences
         </Button>
       </CardContent>
     </Card>
   );
 }