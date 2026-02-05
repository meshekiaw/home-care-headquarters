 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Label } from "@/components/ui/label";
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
 import { Plus, Users, Phone, Mail, Calendar, Trash2, Stethoscope } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { Link } from "react-router-dom";
 
 interface Nurse {
   id: string;
   first_name: string;
   last_name: string;
   email: string | null;
   phone: string | null;
   license_number: string | null;
   status: string;
 }
 
 interface ClientNurse {
   id: string;
   nurse_id: string;
   assigned_date: string;
   role: string | null;
   is_active: boolean | null;
   notes: string | null;
   nurses: Nurse;
 }
 
 interface AssignedNursesTabProps {
   clientId: string;
 }
 
 export function AssignedNursesTab({ clientId }: AssignedNursesTabProps) {
   const { toast } = useToast();
   const [assignments, setAssignments] = useState<ClientNurse[]>([]);
   const [availableNurses, setAvailableNurses] = useState<Nurse[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState({
     nurse_id: "",
     role: "primary",
     notes: "",
   });
 
   useEffect(() => {
     fetchAssignments();
     fetchAvailableNurses();
   }, [clientId]);
 
   async function fetchAssignments() {
     try {
       const { data, error } = await supabase
         .from('client_nurses')
         .select(`
           id,
           nurse_id,
           assigned_date,
           role,
           is_active,
           notes,
           nurses (
             id,
             first_name,
             last_name,
             email,
             phone,
             license_number,
             status
           )
         `)
         .eq('client_id', clientId)
         .eq('is_active', true)
         .order('assigned_date', { ascending: false });
 
       if (error) throw error;
       setAssignments((data as any) || []);
     } catch (error: any) {
       toast({
         title: "Error loading nurses",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }
 
   async function fetchAvailableNurses() {
     try {
       const { data, error } = await supabase
         .from('nurses')
         .select('*')
         .eq('status', 'active')
         .order('first_name');
 
       if (error) throw error;
       setAvailableNurses(data || []);
     } catch (error: any) {
       console.error('Error fetching nurses:', error);
     }
   }
 
   async function handleSubmit(e: React.FormEvent) {
     e.preventDefault();
     setSaving(true);
 
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("You must be logged in");
 
       const { error } = await supabase.from('client_nurses').insert([{
         client_id: clientId,
         nurse_id: formData.nurse_id,
         user_id: user.id,
         role: formData.role,
         notes: formData.notes || null,
         is_active: true,
       }]);
 
       if (error) throw error;
 
       toast({ title: "Nurse assigned successfully!" });
       setDialogOpen(false);
       setFormData({ nurse_id: "", role: "primary", notes: "" });
       fetchAssignments();
     } catch (error: any) {
       toast({
         title: "Error assigning nurse",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   }
 
   async function handleRemove(id: string) {
     try {
       const { error } = await supabase
         .from('client_nurses')
         .update({ is_active: false })
         .eq('id', id);
 
       if (error) throw error;
 
       toast({ title: "Nurse removed from client!" });
       fetchAssignments();
     } catch (error: any) {
       toast({
         title: "Error removing nurse",
         description: error.message,
         variant: "destructive",
       });
     }
   }
 
   const formatDate = (date: string) => {
     return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
   };
 
   const getRoleBadgeVariant = (role: string | null) => {
     switch (role) {
       case 'primary': return 'default';
       case 'backup': return 'secondary';
       case 'specialist': return 'outline';
       default: return 'secondary';
     }
   };
 
   const assignedIds = assignments.map(a => a.nurse_id);
   const unassignedNurses = availableNurses.filter(n => !assignedIds.includes(n.id));
 
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
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-lg font-semibold">Assigned Nurses</h3>
           <p className="text-sm text-muted-foreground">Nurses assigned to this client for assessments</p>
         </div>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogTrigger asChild>
             <Button disabled={unassignedNurses.length === 0}>
               <Plus className="w-4 h-4 mr-2" />
               Assign Nurse
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Assign Nurse</DialogTitle>
               <DialogDescription>Select a nurse to assign to this client</DialogDescription>
             </DialogHeader>
             <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="nurse_id">Nurse *</Label>
                 <Select 
                   value={formData.nurse_id} 
                   onValueChange={(value) => setFormData(prev => ({ ...prev, nurse_id: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select a nurse" />
                   </SelectTrigger>
                   <SelectContent>
                     {unassignedNurses.map((nurse) => (
                       <SelectItem key={nurse.id} value={nurse.id}>
                         {nurse.first_name} {nurse.last_name}, RN
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="role">Role</Label>
                 <Select 
                   value={formData.role} 
                   onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="primary">Primary Nurse</SelectItem>
                     <SelectItem value="backup">Backup Nurse</SelectItem>
                     <SelectItem value="specialist">Specialist</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="notes">Notes</Label>
                 <Textarea
                   id="notes"
                   value={formData.notes}
                   onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                   placeholder="Any notes about this assignment..."
                   rows={3}
                 />
               </div>
               <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                   Cancel
                 </Button>
                 <Button type="submit" disabled={saving || !formData.nurse_id}>
                   {saving ? "Assigning..." : "Assign Nurse"}
                 </Button>
               </DialogFooter>
             </form>
           </DialogContent>
         </Dialog>
       </div>
 
       {availableNurses.length === 0 && (
         <Card className="border-warning/50 bg-warning/5">
           <CardContent className="flex items-center gap-3 p-4">
             <Stethoscope className="w-5 h-5 text-warning" />
             <p className="text-sm">
               No nurses in the system yet. <a href="/nurses" className="text-primary hover:underline">Add nurses</a> first to assign them to clients.
             </p>
           </CardContent>
         </Card>
       )}
 
       {assignments.length === 0 ? (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12 text-center">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
               <Stethoscope className="w-8 h-8 text-primary" />
             </div>
             <h3 className="text-lg font-semibold mb-2">No Nurses Assigned</h3>
             <p className="text-muted-foreground mb-4 max-w-sm">
               Assign nurses to this client for assessments and care coordination.
             </p>
           </CardContent>
         </Card>
       ) : (
         <div className="grid gap-4 sm:grid-cols-2">
           {assignments.map((assignment) => (
             <Card key={assignment.id}>
               <CardContent className="p-4">
                 <div className="flex items-start justify-between">
                   <div className="flex items-start gap-3">
                     <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                       <span className="text-lg font-semibold text-primary">
                         {assignment.nurses.first_name.charAt(0)}
                         {assignment.nurses.last_name.charAt(0)}
                       </span>
                     </div>
                     <div>
                       <Link 
                         to={`/nurses/${assignment.nurse_id}`}
                         className="font-medium hover:text-primary hover:underline"
                       >
                         {assignment.nurses.first_name} {assignment.nurses.last_name}, RN
                       </Link>
                       <div className="flex items-center gap-2 mt-1">
                         <Badge variant={getRoleBadgeVariant(assignment.role)} className="text-xs capitalize">
                           {assignment.role || 'Nurse'}
                         </Badge>
                       </div>
                       <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                         <Calendar className="w-3 h-3" />
                         Assigned {formatDate(assignment.assigned_date)}
                       </div>
                     </div>
                   </div>
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="text-destructive hover:text-destructive"
                     onClick={() => handleRemove(assignment.id)}
                   >
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
                 
                 <div className="mt-4 pt-3 border-t space-y-2">
                   {assignment.nurses.license_number && (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <Stethoscope className="w-3.5 h-3.5" />
                       License: {assignment.nurses.license_number}
                     </div>
                   )}
                   {assignment.nurses.phone && (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <Phone className="w-3.5 h-3.5" />
                       <a href={`tel:${assignment.nurses.phone}`} className="hover:text-primary">
                         {assignment.nurses.phone}
                       </a>
                     </div>
                   )}
                   {assignment.nurses.email && (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <Mail className="w-3.5 h-3.5" />
                       <a href={`mailto:${assignment.nurses.email}`} className="hover:text-primary">
                         {assignment.nurses.email}
                       </a>
                     </div>
                   )}
                 </div>
 
                 {assignment.notes && (
                   <p className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                     {assignment.notes}
                   </p>
                 )}
               </CardContent>
             </Card>
           ))}
         </div>
       )}
     </div>
   );
 }