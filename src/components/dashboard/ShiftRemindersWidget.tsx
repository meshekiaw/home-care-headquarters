import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Clock, ArrowRight, CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
 
 interface UpcomingShift {
   id: string;
   title: string;
   end_time: string;
   caregiver_name: string;
   client_name: string;
   minutes_until_end: number;
 }
 
 interface RecentNotification {
   id: string;
   subject: string;
   notification_type: string;
   created_at: string;
   email_sent: boolean;
   sms_sent: boolean;
   related_id: string | null;
 }
 
export default function ShiftRemindersWidget() {
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const { toast } = useToast();

  const unreadCount = recentNotifications.filter(n => !n.email_sent && !n.sms_sent).length;

  const handleMarkAllAsRead = async () => {
    setMarkingRead(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ email_sent: true, sms_sent: true })
        .or('email_sent.eq.false,sms_sent.eq.false');

      if (error) throw error;

      // Update local state
      setRecentNotifications(prev => 
        prev.map(n => ({ ...n, email_sent: true, sms_sent: true }))
      );

      toast({
        title: "Notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    } catch (error: any) {
      console.error('Error marking notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read.",
        variant: "destructive",
      });
    } finally {
      setMarkingRead(false);
    }
  };
   useEffect(() => {
     async function fetchData() {
       try {
         const now = new Date();
         const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
 
         // Fetch appointments ending in the next 30 minutes
         const { data: appointments } = await supabase
           .from('appointments')
           .select(`
             id,
             title,
             end_time,
             caregivers:caregiver_id(first_name, last_name),
             clients:client_id(first_name, last_name)
           `)
           .eq('status', 'scheduled')
           .gte('end_time', now.toISOString())
           .lte('end_time', thirtyMinutesFromNow.toISOString())
           .order('end_time', { ascending: true })
           .limit(5);
 
         if (appointments) {
           const shifts = appointments.map((apt: any) => ({
             id: apt.id,
             title: apt.title,
             end_time: apt.end_time,
             caregiver_name: apt.caregivers 
               ? `${apt.caregivers.first_name} ${apt.caregivers.last_name}`
               : 'Unknown',
             client_name: apt.clients
               ? `${apt.clients.first_name} ${apt.clients.last_name}`
               : 'Unknown',
             minutes_until_end: differenceInMinutes(new Date(apt.end_time), now)
           }));
           setUpcomingShifts(shifts);
         }
 
         // Fetch recent notifications
         const { data: notifications } = await supabase
           .from('notifications')
           .select('id, subject, notification_type, created_at, email_sent, sms_sent, related_id')
           .order('created_at', { ascending: false })
           .limit(5);
 
         if (notifications) {
           setRecentNotifications(notifications);
         }
       } catch (error) {
         console.error('Error fetching shift reminders:', error);
       } finally {
         setLoading(false);
       }
     }
 
     fetchData();
     
     // Refresh every minute
     const interval = setInterval(fetchData, 60000);
     return () => clearInterval(interval);
   }, []);
 
   const getNotificationTypeBadge = (type: string) => {
     if (type.includes('shift_reminder')) {
       return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Shift Reminder</Badge>;
     }
     if (type.includes('credential')) {
       return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">Credential</Badge>;
     }
     if (type.includes('assessment')) {
       return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Assessment</Badge>;
     }
     if (type.includes('handoff')) {
       return <Badge variant="secondary" className="bg-success/10 text-success border-success/20">Handoff</Badge>;
     }
     return <Badge variant="outline">{type}</Badge>;
   };
 
   const getNotificationLink = (notification: RecentNotification): string | null => {
     if (!notification.related_id) return null;
     
     const type = notification.notification_type;
     
     if (type.includes('shift_reminder') || type.includes('appointment')) {
       return `/scheduling`;
     }
     if (type.includes('credential') && type.includes('caregiver')) {
       return `/caregivers/${notification.related_id}`;
     }
     if (type.includes('credential') && type.includes('nurse')) {
       return `/nurses/${notification.related_id}`;
     }
     if (type.includes('credential') && type.includes('agency')) {
       return `/settings`;
     }
     if (type.includes('assessment') || type.includes('handoff')) {
       return `/clients/${notification.related_id}`;
     }
     
     return null;
   };
 
   if (loading) {
     return (
       <Card>
         <CardHeader>
           <CardTitle className="text-lg font-semibold flex items-center gap-2">
             <Bell className="w-5 h-5" />
             Shift Reminders & Notifications
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <Skeleton className="h-16 w-full" />
           <Skeleton className="h-16 w-full" />
           <Skeleton className="h-16 w-full" />
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between pb-4">
         <CardTitle className="text-lg font-semibold flex items-center gap-2">
           <Bell className="w-5 h-5 text-primary" />
           Shift Reminders & Notifications
         </CardTitle>
         <Link to="/notifications">
           <Button variant="ghost" size="sm">
             View all
             <ArrowRight className="w-4 h-4 ml-1" />
           </Button>
         </Link>
       </CardHeader>
       <CardContent className="space-y-6">
         {/* Upcoming Shifts Ending Soon */}
         <div>
           <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
             <Clock className="w-4 h-4" />
             Shifts Ending Soon
           </h4>
           {upcomingShifts.length === 0 ? (
             <p className="text-sm text-muted-foreground italic">No shifts ending in the next 30 minutes</p>
           ) : (
             <div className="space-y-2">
               {upcomingShifts.map((shift) => (
                    <Link 
                      to={`/scheduling?highlight=${shift.id}`}
                   key={shift.id} 
                     className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer group"
                 >
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium truncate">{shift.title}</p>
                     <p className="text-xs text-muted-foreground">
                       {shift.caregiver_name} → {shift.client_name}
                     </p>
                   </div>
                     <div className="flex items-center gap-2">
                       <Badge variant="secondary" className="bg-warning/10 text-warning shrink-0">
                         {shift.minutes_until_end} min
                       </Badge>
                       <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                     </div>
                   </Link>
               ))}
             </div>
           )}
         </div>
 
        {/* Recent Notifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Notifications</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markingRead}
                className="h-7 text-xs"
              >
                {markingRead ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3 mr-1" />
                )}
                Mark all as read
              </Button>
            )}
          </div>
           {recentNotifications.length === 0 ? (
             <p className="text-sm text-muted-foreground italic">No recent notifications</p>
           ) : (
             <div className="space-y-2">
               {recentNotifications.map((notification) => {
                 const link = getNotificationLink(notification);
                 const content = (
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                       {getNotificationTypeBadge(notification.notification_type)}
                       <div className="flex gap-1">
                         {notification.email_sent && (
                           <span className="text-xs text-success">✓ Email</span>
                         )}
                         {notification.sms_sent && (
                           <span className="text-xs text-success">✓ SMS</span>
                         )}
                       </div>
                     </div>
                     <p className="text-sm truncate">{notification.subject}</p>
                     <p className="text-xs text-muted-foreground">
                       {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                     </p>
                   </div>
                 );
 
                 if (link) {
                   return (
                     <Link
                       key={notification.id}
                       to={link}
                       className="flex items-start justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
                     >
                       {content}
                       <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
                     </Link>
                   );
                 }
 
                 return (
                   <div 
                     key={notification.id} 
                     className="flex items-start justify-between p-3 rounded-lg bg-secondary/50"
                   >
                     {content}
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       </CardContent>
     </Card>
   );
 }