 import { useState, useEffect } from "react";
 import DashboardLayout from "@/components/layout/DashboardLayout";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { 
   Bell, 
   Mail, 
   Phone, 
   CheckCircle, 
   XCircle, 
   Clock,
   RefreshCw,
   AlertTriangle,
   HandHelping,
   RotateCcw
 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { format } from "date-fns";
 
 interface Notification {
   id: string;
   notification_type: string;
   recipient_email: string | null;
   recipient_phone: string | null;
   subject: string;
   message: string;
   email_sent: boolean;
   sms_sent: boolean;
   email_sent_at: string | null;
   sms_sent_at: string | null;
   error_message: string | null;
   created_at: string;
   nurses?: {
     first_name: string;
     last_name: string;
   };
 }
 
 export default function Notifications() {
   const { toast } = useToast();
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [loading, setLoading] = useState(true);
   const [filter, setFilter] = useState<string>("all");
   const [refreshing, setRefreshing] = useState(false);
   const [resendingId, setResendingId] = useState<string | null>(null);
 
   useEffect(() => {
     fetchNotifications();
   }, [filter]);
 
   async function fetchNotifications() {
     try {
       let query = supabase
         .from("notifications")
         .select(`
           *,
           nurses:recipient_nurse_id (
             first_name,
             last_name
           )
         `)
         .order("created_at", { ascending: false })
         .limit(100);
 
       if (filter !== "all") {
         query = query.eq("notification_type", filter);
       }
 
       const { data, error } = await query;
 
       if (error) throw error;
       setNotifications((data as any) || []);
     } catch (error: any) {
       toast({
         title: "Error loading notifications",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }
 
   async function handleManualCheck() {
     setRefreshing(true);
     try {
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-assessment-notifications`,
         {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
           },
         }
       );
 
       const result = await response.json();
 
       if (response.ok) {
         toast({
           title: "Notification check complete",
           description: `Sent: ${result.sent}, Skipped: ${result.skipped}`,
         });
         fetchNotifications();
       } else {
         throw new Error(result.error || "Failed to run notification check");
       }
     } catch (error: any) {
       toast({
         title: "Error running notification check",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setRefreshing(false);
     }
   }
 
   async function handleResend(notificationId: string) {
     setResendingId(notificationId);
     try {
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-notification`,
         {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
           },
           body: JSON.stringify({ notification_id: notificationId }),
         }
       );
 
       const result = await response.json();
 
       if (response.ok) {
         if (result.success) {
           toast({
             title: "Notification resent",
             description: `Email: ${result.email_sent ? "✓" : "✗"}, SMS: ${result.sms_sent ? "✓" : "✗"}`,
           });
         } else {
           toast({
             title: "Resend failed",
             description: result.error || "Could not resend notification",
             variant: "destructive",
           });
         }
         fetchNotifications();
       } else {
         throw new Error(result.error || "Failed to resend notification");
       }
     } catch (error: any) {
       toast({
         title: "Error resending notification",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setResendingId(null);
     }
   }
 
   const canResend = (notification: Notification) => {
     const hasFailedEmail = notification.recipient_email && !notification.email_sent;
     const hasFailedSms = notification.recipient_phone && !notification.sms_sent;
     return hasFailedEmail || hasFailedSms;
   };
 
   const getTypeIcon = (type: string) => {
     switch (type) {
       case "assessment_expiry":
         return <AlertTriangle className="w-4 h-4 text-warning" />;
       case "handoff_pickup":
         return <HandHelping className="w-4 h-4 text-primary" />;
       default:
         return <Bell className="w-4 h-4" />;
     }
   };
 
   const getTypeBadge = (type: string) => {
     switch (type) {
       case "assessment_expiry":
         return (
           <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
             Assessment Expiry
           </Badge>
         );
       case "handoff_pickup":
         return (
           <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
             Handoff Pickup
           </Badge>
         );
       default:
         return <Badge variant="secondary">{type}</Badge>;
     }
   };
 
   const getDeliveryStatus = (notification: Notification) => {
     const emailStatus = notification.email_sent ? (
     <span className="flex items-center gap-1 text-primary">
         <Mail className="w-3.5 h-3.5" />
         <CheckCircle className="w-3 h-3" />
       </span>
     ) : notification.recipient_email ? (
       <span className="flex items-center gap-1 text-destructive">
         <Mail className="w-3.5 h-3.5" />
         <XCircle className="w-3 h-3" />
       </span>
     ) : null;
 
     const smsStatus = notification.sms_sent ? (
     <span className="flex items-center gap-1 text-primary">
         <Phone className="w-3.5 h-3.5" />
         <CheckCircle className="w-3 h-3" />
       </span>
     ) : notification.recipient_phone ? (
       <span className="flex items-center gap-1 text-destructive">
         <Phone className="w-3.5 h-3.5" />
         <XCircle className="w-3 h-3" />
       </span>
     ) : null;
 
     return (
       <div className="flex items-center gap-3">
         {emailStatus}
         {smsStatus}
         {!emailStatus && !smsStatus && (
           <span className="text-muted-foreground text-xs">No contact info</span>
         )}
       </div>
     );
   };
 
   // Stats
   const totalNotifications = notifications.length;
   const emailsSent = notifications.filter((n) => n.email_sent).length;
   const smsSent = notifications.filter((n) => n.sms_sent).length;
   const failed = notifications.filter(
     (n) => n.error_message && !n.email_sent && !n.sms_sent
   ).length;
 
   return (
     <DashboardLayout>
       <div className="space-y-6">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div>
             <h2 className="text-2xl font-bold">Notifications History</h2>
             <p className="text-muted-foreground">
               Track all sent email and SMS notifications
             </p>
           </div>
           <Button onClick={handleManualCheck} disabled={refreshing}>
             <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
             {refreshing ? "Checking..." : "Run Check Now"}
           </Button>
         </div>
 
         {/* Stats Cards */}
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
           <Card>
             <CardContent className="pt-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 rounded-full bg-primary/10">
                   <Bell className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{totalNotifications}</p>
                   <p className="text-sm text-muted-foreground">Total Notifications</p>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-6">
               <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Mail className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{emailsSent}</p>
                   <p className="text-sm text-muted-foreground">Emails Sent</p>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-6">
               <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary">
                  <Phone className="w-6 h-6 text-secondary-foreground" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{smsSent}</p>
                   <p className="text-sm text-muted-foreground">SMS Sent</p>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-6">
               <div className="flex items-center gap-4">
                 <div className="p-3 rounded-full bg-destructive/10">
                   <XCircle className="w-6 h-6 text-destructive" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{failed}</p>
                   <p className="text-sm text-muted-foreground">Failed</p>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* Filters */}
         <Card>
           <CardHeader className="pb-4">
             <div className="flex items-center justify-between">
               <CardTitle>Notification Log</CardTitle>
               <Select value={filter} onValueChange={setFilter}>
                 <SelectTrigger className="w-48">
                   <SelectValue placeholder="Filter by type" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Types</SelectItem>
                   <SelectItem value="assessment_expiry">Assessment Expiry</SelectItem>
                   <SelectItem value="handoff_pickup">Handoff Pickup</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </CardHeader>
           <CardContent>
             {loading ? (
               <div className="flex items-center justify-center py-12">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
               </div>
             ) : notifications.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-center">
                 <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                   <Bell className="w-8 h-8 text-muted-foreground" />
                 </div>
                 <h3 className="text-lg font-semibold mb-2">No Notifications Yet</h3>
                 <p className="text-muted-foreground max-w-sm">
                   Notifications will appear here when the system sends alerts about
                   expiring assessments or handoff pickups.
                 </p>
               </div>
             ) : (
               <div className="rounded-md border overflow-hidden">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Type</TableHead>
                       <TableHead>Recipient</TableHead>
                       <TableHead>Subject</TableHead>
                       <TableHead>Delivery</TableHead>
                       <TableHead>Date</TableHead>
                       <TableHead className="w-24">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {notifications.map((notification) => (
                       <TableRow key={notification.id}>
                         <TableCell>{getTypeBadge(notification.notification_type)}</TableCell>
                         <TableCell>
                           <div>
                             {notification.nurses ? (
                               <span className="font-medium">
                                 {notification.nurses.first_name} {notification.nurses.last_name}
                               </span>
                             ) : (
                               <span className="text-muted-foreground">Unknown</span>
                             )}
                             {notification.recipient_email && (
                               <p className="text-xs text-muted-foreground">
                                 {notification.recipient_email}
                               </p>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="max-w-xs">
                             <p className="font-medium truncate">{notification.subject}</p>
                             {notification.error_message && (
                               <p className="text-xs text-destructive truncate">
                                 {notification.error_message}
                               </p>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>{getDeliveryStatus(notification)}</TableCell>
                         <TableCell>
                           <div className="flex items-center gap-1 text-sm text-muted-foreground">
                             <Clock className="w-3.5 h-3.5" />
                             {format(new Date(notification.created_at), "MMM d, h:mm a")}
                           </div>
                         </TableCell>
                           <TableCell>
                             {canResend(notification) && (
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleResend(notification.id)}
                                 disabled={resendingId === notification.id}
                                 className="h-8 px-2"
                               >
                                 <RotateCcw
                                   className={`w-4 h-4 mr-1 ${
                                     resendingId === notification.id ? "animate-spin" : ""
                                   }`}
                                 />
                                 Resend
                               </Button>
                             )}
                           </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     </DashboardLayout>
   );
 }