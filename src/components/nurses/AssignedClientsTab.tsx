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
 import { Plus, Users, Phone, Mail, Calendar, Trash2, User } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { Link } from "react-router-dom";
 
 interface Client {
   id: string;
   first_name: string;
   last_name: string;
   email: string | null;
   phone: string | null;
   status: string;
 }
 
 interface ClientNurse {
   id: string;
   client_id: string;
   assigned_date: string;
   role: string | null;
   is_active: boolean | null;
   notes: string | null;
   clients: Client;
 }
 
 interface AssignedClientsTabProps {
   nurseId: string;
 }
 
 export function AssignedClientsTab({ nurseId }: AssignedClientsTabProps) {
   const { toast } = useToast();
   const [assignments, setAssignments] = useState<ClientNurse[]>([]);
   const [availableClients, setAvailableClients] = useState<Client[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState({
     client_id: "",
     role: "primary",
     notes: "",
   });
 
   useEffect(() => {
     fetchAssignments();
     fetchAvailableClients();
   }, [nurseId]);
 
   async function fetchAssignments() {
     try {
       const { data, error } = await supabase
         .from('client_nurses')
         .select(`
           id,
           client_id,
           assigned_date,
           role,
           is_active,
           notes,
           clients (
             id,
             first_name,
             last_name,
             email,
             phone,
             status
           )
         `)
         .eq('nurse_id', nurseId)
         .eq('is_active', true)
         .order('assigned_date', { ascending: false });
 
       if (error) throw error;
       setAssignments((data as any) || []);
     } catch (error: any) {
       toast({
         title: "Error loading clients",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }
 
   async function fetchAvailableClients() {
     try {
       const { data, error } = await supabase
         .from('clients')
         .select('*')
         .eq('status', 'active')
         .order('first_name');
 
       if (error) throw error;
       setAvailableClients(data || []);
     } catch (error: any) {
       console.error('Error fetching clients:', error);
     }
   }
 
   async function handleSubmit(e: React.FormEvent) {
     e.preventDefault();
     setSaving(true);
 
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("You must be logged in");
 
       const { error } = await supabase.from('client_nurses').insert([{
         client_id: formData.client_id,
         nurse_id: nurseId,
         user_id: user.id,
         role: formData.role,
         notes: formData.notes || null,
         is_active: true,
       }]);
 
       if (error) throw error;
 
       toast({ title: "Client assigned successfully!" });
       setDialogOpen(false);
       setFormData({ client_id: "", role: "primary", notes: "" });
       fetchAssignments();
     } catch (error: any) {
       toast({
         title: "Error assigning client",
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
 
       toast({ title: "Client removed from nurse!" });
       fetchAssignments();
     } catch (error: any) {
       toast({
         title: "Error removing client",
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
 
   const assignedIds = assignments.map(a => a.client_id);
   const unassignedClients = availableClients.filter(c => !assignedIds.includes(c.id));
 
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
           <h3 className="text-lg font-semibold">Assigned Clients</h3>
           <p className="text-sm text-muted-foreground">Clients assigned to this nurse for care</p>
         </div>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogTrigger asChild>
             <Button disabled={unassignedClients.length === 0}>
               <Plus className="w-4 h-4 mr-2" />
               Assign Client
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Assign Client</DialogTitle>
               <DialogDescription>Select a client to assign to this nurse</DialogDescription>
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
                     {unassignedClients.map((client) => (
                       <SelectItem key={client.id} value={client.id}>
                         {client.first_name} {client.last_name}
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
                 <Button type="submit" disabled={saving || !formData.client_id}>
                   {saving ? "Assigning..." : "Assign Client"}
                 </Button>
               </DialogFooter>
             </form>
           </DialogContent>
         </Dialog>
       </div>
 
       {assignments.length === 0 ? (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12 text-center">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
               <Users className="w-8 h-8 text-primary" />
             </div>
             <h3 className="text-lg font-semibold mb-2">No Clients Assigned</h3>
             <p className="text-muted-foreground mb-4 max-w-sm">
               Assign clients to this nurse to manage their caseload.
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
                         {assignment.clients.first_name.charAt(0)}
                         {assignment.clients.last_name.charAt(0)}
                       </span>
                     </div>
                     <div>
                       <Link 
                         to={`/clients/${assignment.client_id}`}
                         className="font-medium hover:text-primary hover:underline"
                       >
                         {assignment.clients.first_name} {assignment.clients.last_name}
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
                   {assignment.clients.phone && (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <Phone className="w-3.5 h-3.5" />
                       <a href={`tel:${assignment.clients.phone}`} className="hover:text-primary">
                         {assignment.clients.phone}
                       </a>
                     </div>
                   )}
                   {assignment.clients.email && (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <Mail className="w-3.5 h-3.5" />
                       <a href={`mailto:${assignment.clients.email}`} className="hover:text-primary">
                         {assignment.clients.email}
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