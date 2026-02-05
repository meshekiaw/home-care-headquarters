 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
   DialogFooter,
 } from "@/components/ui/dialog";
 import { Plus, Clock, AlertTriangle, CheckCircle, Calendar, User, HandHelping } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { Link } from "react-router-dom";
 import { differenceInDays, format } from "date-fns";
 
 interface Client {
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
   completed_date: string | null;
   status: string;
   notes: string | null;
   clients: Client;
 }
 
 interface AssignedClient {
   client_id: string;
   clients: Client;
 }
 
 interface ExpiringAssessmentsTabProps {
   nurseId: string;
 }
 
 export function ExpiringAssessmentsTab({ nurseId }: ExpiringAssessmentsTabProps) {
   const { toast } = useToast();
   const [assessments, setAssessments] = useState<Assessment[]>([]);
   const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
   const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState({
     client_id: "",
     assessment_type: "initial",
     assessment_name: "",
     due_date: "",
     notes: "",
   });
   const [handoffReason, setHandoffReason] = useState("");
 
   useEffect(() => {
     fetchAssessments();
     fetchAssignedClients();
   }, [nurseId]);
 
   async function fetchAssessments() {
     try {
       const { data, error } = await supabase
         .from('client_assessments')
         .select(`
           id,
           client_id,
           assessment_type,
           assessment_name,
           due_date,
           completed_date,
           status,
           notes,
           clients (
             id,
             first_name,
             last_name
           )
         `)
         .eq('assigned_nurse_id', nurseId)
         .neq('status', 'completed')
         .order('due_date', { ascending: true });
 
       if (error) throw error;
       setAssessments((data as any) || []);
     } catch (error: any) {
       toast({
         title: "Error loading assessments",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }
 
   async function fetchAssignedClients() {
     try {
       const { data, error } = await supabase
         .from('client_nurses')
         .select(`
           client_id,
           clients (
             id,
             first_name,
             last_name
           )
         `)
         .eq('nurse_id', nurseId)
         .eq('is_active', true);
 
       if (error) throw error;
       setAssignedClients((data as any) || []);
     } catch (error: any) {
       console.error('Error fetching assigned clients:', error);
     }
   }
 
   async function handleSubmit(e: React.FormEvent) {
     e.preventDefault();
     setSaving(true);
 
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("You must be logged in");
 
       const { error } = await supabase.from('client_assessments').insert([{
         client_id: formData.client_id,
         assigned_nurse_id: nurseId,
         user_id: user.id,
         assessment_type: formData.assessment_type,
         assessment_name: formData.assessment_name,
         due_date: formData.due_date,
         notes: formData.notes || null,
         status: 'pending',
       }]);
 
       if (error) throw error;
 
       toast({ title: "Assessment scheduled successfully!" });
       setDialogOpen(false);
       setFormData({ client_id: "", assessment_type: "initial", assessment_name: "", due_date: "", notes: "" });
       fetchAssessments();
     } catch (error: any) {
       toast({
         title: "Error scheduling assessment",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   }
 
   async function handleComplete(assessmentId: string) {
     try {
       const { error } = await supabase
         .from('client_assessments')
         .update({ 
           status: 'completed',
           completed_date: new Date().toISOString().split('T')[0]
         })
         .eq('id', assessmentId);
 
       if (error) throw error;
 
       toast({ title: "Assessment marked as complete!" });
       fetchAssessments();
     } catch (error: any) {
       toast({
         title: "Error updating assessment",
         description: error.message,
         variant: "destructive",
       });
     }
   }
 
   async function handleHandoff() {
     if (!selectedAssessment) return;
     setSaving(true);
 
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("You must be logged in");
 
       // Create handoff record
       const { error: handoffError } = await supabase.from('assessment_handoffs').insert([{
         assessment_id: selectedAssessment.id,
         released_by_nurse_id: nurseId,
         user_id: user.id,
         reason: handoffReason || null,
         status: 'available',
       }]);
 
       if (handoffError) throw handoffError;
 
       // Update assessment status
       const { error: updateError } = await supabase
         .from('client_assessments')
         .update({ 
           status: 'handoff',
           assigned_nurse_id: null
         })
         .eq('id', selectedAssessment.id);
 
       if (updateError) throw updateError;
 
       toast({ title: "Assessment released for handoff!" });
       setHandoffDialogOpen(false);
       setSelectedAssessment(null);
       setHandoffReason("");
       fetchAssessments();
     } catch (error: any) {
       toast({
         title: "Error releasing assessment",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   }
 
   const getDaysUntilDue = (dueDate: string) => {
     return differenceInDays(new Date(dueDate), new Date());
   };
 
   const getStatusBadge = (assessment: Assessment) => {
     const daysUntil = getDaysUntilDue(assessment.due_date);
     
     if (daysUntil < 0) {
       return <Badge variant="destructive">Overdue</Badge>;
     } else if (daysUntil <= 7) {
       return <Badge variant="destructive">Due in {daysUntil} days</Badge>;
     } else if (daysUntil <= 30) {
       return <Badge className="bg-warning text-warning-foreground">Due in {daysUntil} days</Badge>;
     } else {
       return <Badge variant="secondary">Due in {daysUntil} days</Badge>;
     }
   };
 
   const expiringWithin30Days = assessments.filter(a => getDaysUntilDue(a.due_date) <= 30);
   const upcoming = assessments.filter(a => getDaysUntilDue(a.due_date) > 30);
 
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
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-lg font-semibold">Client Assessments</h3>
           <p className="text-sm text-muted-foreground">Track and manage client assessments</p>
         </div>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogTrigger asChild>
             <Button disabled={assignedClients.length === 0}>
               <Plus className="w-4 h-4 mr-2" />
               Schedule Assessment
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Schedule Assessment</DialogTitle>
               <DialogDescription>Create a new assessment for a client</DialogDescription>
             </DialogHeader>
             <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="client_id">Client *</Label>
                 <Select 
                   value={formData.client_id} 
                   onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select a client" />
                   </SelectTrigger>
                   <SelectContent>
                     {assignedClients.map((ac) => (
                       <SelectItem key={ac.client_id} value={ac.client_id}>
                         {ac.clients.first_name} {ac.clients.last_name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="assessment_type">Assessment Type *</Label>
                 <Select 
                   value={formData.assessment_type} 
                   onValueChange={(value) => setFormData(prev => ({ ...prev, assessment_type: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="initial">Initial Assessment</SelectItem>
                     <SelectItem value="quarterly">Quarterly Review</SelectItem>
                     <SelectItem value="annual">Annual Assessment</SelectItem>
                     <SelectItem value="supervisory">Supervisory Visit</SelectItem>
                     <SelectItem value="recertification">Recertification</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="assessment_name">Assessment Name *</Label>
                 <Input
                   id="assessment_name"
                   value={formData.assessment_name}
                   onChange={(e) => setFormData(prev => ({ ...prev, assessment_name: e.target.value }))}
                   placeholder="e.g., Q1 2026 Assessment"
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="due_date">Due Date *</Label>
                 <Input
                   id="due_date"
                   type="date"
                   value={formData.due_date}
                   onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="notes">Notes</Label>
                 <Textarea
                   id="notes"
                   value={formData.notes}
                   onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                   placeholder="Any notes about this assessment..."
                   rows={3}
                 />
               </div>
               <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                   Cancel
                 </Button>
                 <Button type="submit" disabled={saving || !formData.client_id || !formData.assessment_name || !formData.due_date}>
                   {saving ? "Scheduling..." : "Schedule Assessment"}
                 </Button>
               </DialogFooter>
             </form>
           </DialogContent>
         </Dialog>
       </div>
 
       {/* Expiring Within 30 Days */}
       {expiringWithin30Days.length > 0 && (
         <Card className="border-warning/50">
           <CardHeader className="pb-3">
             <CardTitle className="flex items-center gap-2 text-warning">
               <AlertTriangle className="w-5 h-5" />
               Expiring Within 30 Days ({expiringWithin30Days.length})
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             {expiringWithin30Days.map((assessment) => (
               <div key={assessment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                     <User className="w-5 h-5 text-warning" />
                   </div>
                   <div>
                     <Link 
                       to={`/clients/${assessment.client_id}`}
                       className="font-medium hover:text-primary hover:underline"
                     >
                       {assessment.clients.first_name} {assessment.clients.last_name}
                     </Link>
                     <p className="text-sm text-muted-foreground">
                       {assessment.assessment_name} ({assessment.assessment_type})
                     </p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   {getStatusBadge(assessment)}
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => {
                       setSelectedAssessment(assessment);
                       setHandoffDialogOpen(true);
                     }}
                   >
                     <HandHelping className="w-4 h-4 mr-1" />
                     Handoff
                   </Button>
                   <Button
                     size="sm"
                     onClick={() => handleComplete(assessment.id)}
                   >
                     <CheckCircle className="w-4 h-4 mr-1" />
                     Complete
                   </Button>
                 </div>
               </div>
             ))}
           </CardContent>
         </Card>
       )}
 
       {/* Upcoming Assessments */}
       {upcoming.length > 0 && (
         <Card>
           <CardHeader className="pb-3">
             <CardTitle className="flex items-center gap-2">
               <Clock className="w-5 h-5" />
               Upcoming Assessments ({upcoming.length})
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             {upcoming.map((assessment) => (
               <div key={assessment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                     <User className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                     <Link 
                       to={`/clients/${assessment.client_id}`}
                       className="font-medium hover:text-primary hover:underline"
                     >
                       {assessment.clients.first_name} {assessment.clients.last_name}
                     </Link>
                     <p className="text-sm text-muted-foreground">
                       {assessment.assessment_name} ({assessment.assessment_type})
                     </p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   {getStatusBadge(assessment)}
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleComplete(assessment.id)}
                   >
                     <CheckCircle className="w-4 h-4 mr-1" />
                     Complete
                   </Button>
                 </div>
               </div>
             ))}
           </CardContent>
         </Card>
       )}
 
       {assessments.length === 0 && (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12 text-center">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
               <Clock className="w-8 h-8 text-primary" />
             </div>
             <h3 className="text-lg font-semibold mb-2">No Pending Assessments</h3>
             <p className="text-muted-foreground mb-4 max-w-sm">
               Schedule assessments for your assigned clients to track due dates.
             </p>
           </CardContent>
         </Card>
       )}
 
       {/* Handoff Dialog */}
       <Dialog open={handoffDialogOpen} onOpenChange={setHandoffDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Release for Handoff</DialogTitle>
             <DialogDescription>
               Release this assessment so another nurse can pick it up
             </DialogDescription>
           </DialogHeader>
           {selectedAssessment && (
             <div className="space-y-4">
               <div className="p-3 rounded-lg border bg-muted/50">
                 <p className="font-medium">
                   {selectedAssessment.clients.first_name} {selectedAssessment.clients.last_name}
                 </p>
                 <p className="text-sm text-muted-foreground">
                   {selectedAssessment.assessment_name}
                 </p>
                 <p className="text-sm text-muted-foreground">
                   Due: {format(new Date(selectedAssessment.due_date), 'MMM d, yyyy')}
                 </p>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="reason">Reason for Handoff</Label>
                 <Textarea
                   id="reason"
                   value={handoffReason}
                   onChange={(e) => setHandoffReason(e.target.value)}
                   placeholder="Why are you releasing this assessment?"
                   rows={3}
                 />
               </div>
               <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setHandoffDialogOpen(false)}>
                   Cancel
                 </Button>
                 <Button onClick={handleHandoff} disabled={saving}>
                   {saving ? "Releasing..." : "Release for Handoff"}
                 </Button>
               </DialogFooter>
             </div>
           )}
         </DialogContent>
       </Dialog>
     </div>
   );
 }