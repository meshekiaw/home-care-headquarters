 import { useState, useEffect } from "react";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Building2, Plus, Loader2, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";
 import { format, differenceInDays, parseISO } from "date-fns";
 
 interface AgencyCredential {
   id: string;
   credential_name: string;
   credential_type: string;
   credential_number: string | null;
   issuing_organization: string | null;
   issue_date: string | null;
   expiry_date: string | null;
   status: string;
   notes: string | null;
 }
 
 const credentialTypes = [
   "Business License",
   "State License",
   "Medicare Certification",
   "Medicaid Certification",
   "Accreditation",
   "Insurance",
   "Bond",
   "Other",
 ];
 
 export function AgencyCredentialsSection() {
   const { toast } = useToast();
   const { user } = useAuth();
   const [loading, setLoading] = useState(true);
   const [credentials, setCredentials] = useState<AgencyCredential[]>([]);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState({
     credential_name: "",
     credential_type: "",
     credential_number: "",
     issuing_organization: "",
     issue_date: "",
     expiry_date: "",
     notes: "",
   });
 
   useEffect(() => {
     if (user) fetchCredentials();
   }, [user]);
 
   async function fetchCredentials() {
     try {
       const { data, error } = await supabase
         .from("agency_credentials")
         .select("*")
         .order("expiry_date", { ascending: true });
 
       if (error) throw error;
       setCredentials(data || []);
     } catch (error: any) {
       console.error("Error fetching agency credentials:", error);
     } finally {
       setLoading(false);
     }
   }
 
   async function handleSubmit(e: React.FormEvent) {
     e.preventDefault();
     if (!user) return;
     setSaving(true);
 
     try {
       const { error } = await supabase.from("agency_credentials").insert({
         user_id: user.id,
         credential_name: formData.credential_name,
         credential_type: formData.credential_type,
         credential_number: formData.credential_number || null,
         issuing_organization: formData.issuing_organization || null,
         issue_date: formData.issue_date || null,
         expiry_date: formData.expiry_date || null,
         notes: formData.notes || null,
       });
 
       if (error) throw error;
 
       toast({ title: "Credential added", description: "Agency credential has been saved." });
       setDialogOpen(false);
       setFormData({
         credential_name: "",
         credential_type: "",
         credential_number: "",
         issuing_organization: "",
         issue_date: "",
         expiry_date: "",
         notes: "",
       });
       fetchCredentials();
     } catch (error: any) {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     } finally {
       setSaving(false);
     }
   }
 
   async function handleDelete(id: string) {
     try {
       const { error } = await supabase.from("agency_credentials").delete().eq("id", id);
       if (error) throw error;
       toast({ title: "Deleted", description: "Credential removed." });
       fetchCredentials();
     } catch (error: any) {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     }
   }
 
   function getExpiryStatus(expiryDate: string | null) {
     if (!expiryDate) return { label: "No Expiry", variant: "secondary" as const, icon: CheckCircle };
     const days = differenceInDays(parseISO(expiryDate), new Date());
     if (days < 0) return { label: "Expired", variant: "destructive" as const, icon: AlertTriangle };
     if (days <= 30) return { label: `${days}d left`, variant: "destructive" as const, icon: AlertTriangle };
     if (days <= 60) return { label: `${days}d left`, variant: "secondary" as const, icon: AlertTriangle };
     return { label: "Valid", variant: "default" as const, icon: CheckCircle };
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
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Building2 className="w-5 h-5 text-primary" />
             <CardTitle className="text-lg">Agency Credentials</CardTitle>
           </div>
           <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
             <DialogTrigger asChild>
               <Button size="sm">
                 <Plus className="w-4 h-4 mr-2" />
                 Add Credential
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Add Agency Credential</DialogTitle>
               </DialogHeader>
               <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="credential_name">Credential Name *</Label>
                     <Input
                       id="credential_name"
                       value={formData.credential_name}
                       onChange={(e) => setFormData({ ...formData, credential_name: e.target.value })}
                       required
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="credential_type">Type *</Label>
                     <Select
                       value={formData.credential_type}
                       onValueChange={(v) => setFormData({ ...formData, credential_type: v })}
                       required
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Select type" />
                       </SelectTrigger>
                       <SelectContent>
                         {credentialTypes.map((t) => (
                           <SelectItem key={t} value={t}>{t}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="credential_number">Credential Number</Label>
                     <Input
                       id="credential_number"
                       value={formData.credential_number}
                       onChange={(e) => setFormData({ ...formData, credential_number: e.target.value })}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="issuing_organization">Issuing Organization</Label>
                     <Input
                       id="issuing_organization"
                       value={formData.issuing_organization}
                       onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
                     />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="issue_date">Issue Date</Label>
                     <Input
                       id="issue_date"
                       type="date"
                       value={formData.issue_date}
                       onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="expiry_date">Expiry Date</Label>
                     <Input
                       id="expiry_date"
                       type="date"
                       value={formData.expiry_date}
                       onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="notes">Notes</Label>
                   <Input
                     id="notes"
                     value={formData.notes}
                     onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                   />
                 </div>
                 <Button type="submit" disabled={saving} className="w-full">
                   {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                   Add Credential
                 </Button>
               </form>
             </DialogContent>
           </Dialog>
         </div>
         <CardDescription>
           Manage agency-level licenses, certifications, and insurance
         </CardDescription>
       </CardHeader>
       <CardContent>
         {credentials.length === 0 ? (
           <p className="text-sm text-muted-foreground text-center py-8">
             No agency credentials added yet.
           </p>
         ) : (
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Credential</TableHead>
                 <TableHead>Type</TableHead>
                 <TableHead>Expiry</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead className="w-10"></TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {credentials.map((cred) => {
                 const status = getExpiryStatus(cred.expiry_date);
                 const StatusIcon = status.icon;
                 return (
                   <TableRow key={cred.id}>
                     <TableCell className="font-medium">{cred.credential_name}</TableCell>
                     <TableCell>{cred.credential_type}</TableCell>
                     <TableCell>
                       {cred.expiry_date ? format(parseISO(cred.expiry_date), "MMM d, yyyy") : "—"}
                     </TableCell>
                     <TableCell>
                       <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                         <StatusIcon className="w-3 h-3" />
                         {status.label}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => handleDelete(cred.id)}
                       >
                         <Trash2 className="w-4 h-4 text-destructive" />
                       </Button>
                     </TableCell>
                   </TableRow>
                 );
               })}
             </TableBody>
           </Table>
         )}
       </CardContent>
     </Card>
   );
 }