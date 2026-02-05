 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { HandHelping, User, Calendar, Clock, CheckCircle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { Link } from "react-router-dom";
 import { differenceInDays, format } from "date-fns";
 
 interface Client {
   id: string;
   first_name: string;
   last_name: string;
 }
 
 interface Nurse {
   id: string;
   first_name: string;
   last_name: string;
 }
 
 interface Assessment {
   id: string;
   client_id: string;
   assessment_type: string;
   assessment_name: string;
   due_date: string;
   clients: Client;
 }
 
 interface Handoff {
   id: string;
   assessment_id: string;
   released_by_nurse_id: string;
   reason: string | null;
   released_at: string;
   status: string;
   client_assessments: Assessment;
   nurses: Nurse;
 }
 
 interface HandoffQueueTabProps {
   nurseId: string;
 }
 
 export function HandoffQueueTab({ nurseId }: HandoffQueueTabProps) {
   const { toast } = useToast();
   const [availableHandoffs, setAvailableHandoffs] = useState<Handoff[]>([]);
   const [myReleasedHandoffs, setMyReleasedHandoffs] = useState<Handoff[]>([]);
   const [loading, setLoading] = useState(true);
   const [picking, setPicking] = useState<string | null>(null);
 
   useEffect(() => {
     fetchHandoffs();
   }, [nurseId]);
 
   async function fetchHandoffs() {
     try {
       // Fetch available handoffs (not released by current nurse)
       const { data: available, error: availableError } = await supabase
         .from('assessment_handoffs')
         .select(`
           id,
           assessment_id,
           released_by_nurse_id,
           reason,
           released_at,
           status,
           client_assessments (
             id,
             client_id,
             assessment_type,
             assessment_name,
             due_date,
             clients (
               id,
               first_name,
               last_name
             )
           ),
           nurses!assessment_handoffs_released_by_nurse_id_fkey (
             id,
             first_name,
             last_name
           )
         `)
         .eq('status', 'available')
         .neq('released_by_nurse_id', nurseId)
         .order('released_at', { ascending: false });
 
       if (availableError) throw availableError;
 
       // Fetch my released handoffs
       const { data: myReleased, error: myReleasedError } = await supabase
         .from('assessment_handoffs')
         .select(`
           id,
           assessment_id,
           released_by_nurse_id,
           reason,
           released_at,
           status,
           client_assessments (
             id,
             client_id,
             assessment_type,
             assessment_name,
             due_date,
             clients (
               id,
               first_name,
               last_name
             )
           ),
           nurses!assessment_handoffs_released_by_nurse_id_fkey (
             id,
             first_name,
             last_name
           )
         `)
         .eq('released_by_nurse_id', nurseId)
         .eq('status', 'available')
         .order('released_at', { ascending: false });
 
       if (myReleasedError) throw myReleasedError;
 
       setAvailableHandoffs((available as any) || []);
       setMyReleasedHandoffs((myReleased as any) || []);
     } catch (error: any) {
       toast({
         title: "Error loading handoffs",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }
 
   async function handlePickup(handoff: Handoff) {
     setPicking(handoff.id);
 
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("You must be logged in");
 
       // Update handoff record
       const { error: handoffError } = await supabase
         .from('assessment_handoffs')
         .update({
           picked_up_by_nurse_id: nurseId,
           picked_up_at: new Date().toISOString(),
           status: 'picked_up',
         })
         .eq('id', handoff.id);
 
       if (handoffError) throw handoffError;
 
       // Update assessment to assign to current nurse
       const { error: assessmentError } = await supabase
         .from('client_assessments')
         .update({
           assigned_nurse_id: nurseId,
           status: 'pending',
         })
         .eq('id', handoff.assessment_id);
 
       if (assessmentError) throw assessmentError;
 
       toast({ title: "Assessment picked up successfully!" });
       fetchHandoffs();
     } catch (error: any) {
       toast({
         title: "Error picking up assessment",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setPicking(null);
     }
   }
 
   async function handleCancelHandoff(handoffId: string, assessmentId: string) {
     try {
       // Delete handoff record
       const { error: deleteError } = await supabase
         .from('assessment_handoffs')
         .delete()
         .eq('id', handoffId);
 
       if (deleteError) throw deleteError;
 
       // Reassign assessment back to current nurse
       const { error: updateError } = await supabase
         .from('client_assessments')
         .update({
           assigned_nurse_id: nurseId,
           status: 'pending',
         })
         .eq('id', assessmentId);
 
       if (updateError) throw updateError;
 
       toast({ title: "Handoff cancelled - assessment returned to your queue" });
       fetchHandoffs();
     } catch (error: any) {
       toast({
         title: "Error cancelling handoff",
         description: error.message,
         variant: "destructive",
       });
     }
   }
 
   const getDaysUntilDue = (dueDate: string) => {
     return differenceInDays(new Date(dueDate), new Date());
   };
 
   const getUrgencyBadge = (dueDate: string) => {
     const daysUntil = getDaysUntilDue(dueDate);
     
     if (daysUntil < 0) {
       return <Badge variant="destructive">Overdue</Badge>;
     } else if (daysUntil <= 7) {
       return <Badge variant="destructive">Urgent - {daysUntil} days</Badge>;
     } else if (daysUntil <= 14) {
       return <Badge className="bg-warning text-warning-foreground">{daysUntil} days left</Badge>;
     } else {
       return <Badge variant="secondary">{daysUntil} days left</Badge>;
     }
   };
 
   if (loading) {
     return (
       <Card>
         <CardContent className="flex items-center justify-center py-12">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <div className="space-y-6">
       <div>
         <h3 className="text-lg font-semibold">Handoff Queue</h3>
         <p className="text-sm text-muted-foreground">Pick up assessments from other nurses or manage your released clients</p>
       </div>
 
       {/* Available for Pickup */}
       <Card>
         <CardHeader className="pb-3">
           <CardTitle className="flex items-center gap-2">
             <HandHelping className="w-5 h-5" />
             Available for Pickup ({availableHandoffs.length})
           </CardTitle>
         </CardHeader>
         <CardContent>
           {availableHandoffs.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-6">
               No assessments available for pickup right now
             </p>
           ) : (
             <div className="space-y-3">
               {availableHandoffs.map((handoff) => (
                 <div key={handoff.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                   <div className="flex items-start gap-3">
                     <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                       <User className="w-5 h-5 text-primary" />
                     </div>
                     <div>
                       <Link 
                         to={`/clients/${handoff.client_assessments.client_id}`}
                         className="font-medium hover:text-primary hover:underline"
                       >
                         {handoff.client_assessments.clients.first_name} {handoff.client_assessments.clients.last_name}
                       </Link>
                       <p className="text-sm text-muted-foreground">
                         {handoff.client_assessments.assessment_name}
                       </p>
                       <p className="text-xs text-muted-foreground mt-1">
                         Released by: {handoff.nurses.first_name} {handoff.nurses.last_name}
                       </p>
                       {handoff.reason && (
                         <p className="text-xs text-muted-foreground italic mt-1">
                           "{handoff.reason}"
                         </p>
                       )}
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     {getUrgencyBadge(handoff.client_assessments.due_date)}
                     <Button
                       size="sm"
                       onClick={() => handlePickup(handoff)}
                       disabled={picking === handoff.id}
                     >
                       {picking === handoff.id ? "Picking up..." : "Pick Up"}
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* My Released Clients */}
       {myReleasedHandoffs.length > 0 && (
         <Card>
           <CardHeader className="pb-3">
             <CardTitle className="flex items-center gap-2">
               <Clock className="w-5 h-5" />
               My Released Assessments ({myReleasedHandoffs.length})
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-3">
               {myReleasedHandoffs.map((handoff) => (
                 <div key={handoff.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                   <div className="flex items-start gap-3">
                     <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                       <User className="w-5 h-5 text-muted-foreground" />
                     </div>
                     <div>
                       <p className="font-medium">
                         {handoff.client_assessments.clients.first_name} {handoff.client_assessments.clients.last_name}
                       </p>
                       <p className="text-sm text-muted-foreground">
                         {handoff.client_assessments.assessment_name}
                       </p>
                       <p className="text-xs text-muted-foreground mt-1">
                         Released: {format(new Date(handoff.released_at), 'MMM d, yyyy h:mm a')}
                       </p>
                       {handoff.reason && (
                         <p className="text-xs text-muted-foreground italic mt-1">
                           Reason: {handoff.reason}
                         </p>
                       )}
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Badge variant="outline">Waiting for pickup</Badge>
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => handleCancelHandoff(handoff.id, handoff.assessment_id)}
                     >
                       Take Back
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }