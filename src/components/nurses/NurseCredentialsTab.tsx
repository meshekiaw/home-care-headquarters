 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Plus, FileText, Download, Trash2, Upload, AlertTriangle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { AddCredentialDialog } from "./AddCredentialDialog";
 
 interface Credential {
   id: string;
   credential_type: string;
   credential_name: string;
   credential_number: string | null;
   issuing_organization: string | null;
   issue_date: string | null;
   expiry_date: string | null;
   document_url: string | null;
   status: string;
   notes: string | null;
 }
 
 interface NurseCredentialsTabProps {
   nurseId: string;
 }
 
 const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
   rn_license: "RN License",
   bls_cpr: "BLS/CPR",
   specialty_cert: "Specialty Certification",
   tb_test: "TB Test",
   background_check: "Background Check",
   other: "Other",
 };
 
 export function NurseCredentialsTab({ nurseId }: NurseCredentialsTabProps) {
   const [credentials, setCredentials] = useState<Credential[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const { toast } = useToast();
 
   useEffect(() => {
     fetchCredentials();
   }, [nurseId]);
 
   async function fetchCredentials() {
     try {
       const { data, error } = await supabase
         .from("nurse_credentials")
         .select("*")
         .eq("nurse_id", nurseId)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setCredentials(data || []);
     } catch (error: any) {
       toast({
         title: "Error loading credentials",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }
 
   const handleDelete = async (id: string, documentUrl: string | null) => {
     if (!confirm("Are you sure you want to delete this credential?")) return;
 
     try {
       // Delete document from storage if exists
       if (documentUrl) {
         const path = documentUrl.split("/nurse-credentials/")[1];
         if (path) {
           await supabase.storage.from("nurse-credentials").remove([path]);
         }
       }
 
       const { error } = await supabase
         .from("nurse_credentials")
         .delete()
         .eq("id", id);
 
       if (error) throw error;
 
       toast({ title: "Credential deleted" });
       fetchCredentials();
     } catch (error: any) {
       toast({
         title: "Error deleting credential",
         description: error.message,
         variant: "destructive",
       });
     }
   };
 
   const isExpiringSoon = (expiryDate: string | null) => {
     if (!expiryDate) return false;
     const expiry = new Date(expiryDate);
     const today = new Date();
     const daysUntilExpiry = Math.ceil(
       (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
     );
     return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
   };
 
   const isExpired = (expiryDate: string | null) => {
     if (!expiryDate) return false;
     return new Date(expiryDate) < new Date();
   };
 
   const getStatusBadge = (credential: Credential) => {
     if (isExpired(credential.expiry_date)) {
       return <Badge variant="destructive">Expired</Badge>;
     }
     if (isExpiringSoon(credential.expiry_date)) {
       return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Expiring Soon</Badge>;
     }
     return <Badge variant="default">Active</Badge>;
   };
 
   const activeCount = credentials.filter(c => !isExpired(c.expiry_date)).length;
   const expiringCount = credentials.filter(c => isExpiringSoon(c.expiry_date)).length;
   const expiredCount = credentials.filter(c => isExpired(c.expiry_date)).length;
 
   return (
     <div className="space-y-6">
       {/* Summary Cards */}
       <div className="grid gap-4 md:grid-cols-3">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Credentials</CardTitle>
             <FileText className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{credentials.length}</div>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
             <AlertTriangle className="h-4 w-4 text-yellow-500" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-yellow-600">{expiringCount}</div>
             <p className="text-xs text-muted-foreground">Within 30 days</p>
           </CardContent>
         </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Expired</CardTitle>
             <AlertTriangle className="h-4 w-4 text-destructive" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-destructive">{expiredCount}</div>
           </CardContent>
         </Card>
       </div>
 
       {/* Credentials List */}
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
           <CardTitle>Credentials & Certifications</CardTitle>
           <Button onClick={() => setDialogOpen(true)}>
             <Plus className="w-4 h-4 mr-2" />
             Add Credential
           </Button>
         </CardHeader>
         <CardContent>
           {loading ? (
             <p className="text-center py-8 text-muted-foreground">Loading...</p>
           ) : credentials.length === 0 ? (
             <div className="text-center py-8">
               <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
               <p className="text-muted-foreground">No credentials added yet</p>
               <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                 <Plus className="w-4 h-4 mr-2" />
                 Add First Credential
               </Button>
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Type</TableHead>
                   <TableHead>Name / Number</TableHead>
                   <TableHead>Issuing Organization</TableHead>
                   <TableHead>Expiry Date</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Document</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {credentials.map((cred) => (
                   <TableRow key={cred.id}>
                     <TableCell className="font-medium">
                       {CREDENTIAL_TYPE_LABELS[cred.credential_type] || cred.credential_type}
                     </TableCell>
                     <TableCell>
                       <div>{cred.credential_name}</div>
                       {cred.credential_number && (
                         <div className="text-sm text-muted-foreground">#{cred.credential_number}</div>
                       )}
                     </TableCell>
                     <TableCell>{cred.issuing_organization || "—"}</TableCell>
                     <TableCell>
                       {cred.expiry_date
                         ? new Date(cred.expiry_date).toLocaleDateString()
                         : "No expiry"}
                     </TableCell>
                     <TableCell>{getStatusBadge(cred)}</TableCell>
                     <TableCell>
                       {cred.document_url ? (
                         <a
                           href={cred.document_url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-primary hover:underline flex items-center gap-1"
                         >
                           <Download className="w-4 h-4" />
                           View
                         </a>
                       ) : (
                         <span className="text-muted-foreground">—</span>
                       )}
                     </TableCell>
                     <TableCell className="text-right">
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleDelete(cred.id, cred.document_url)}
                       >
                         <Trash2 className="w-4 h-4 text-destructive" />
                       </Button>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
 
       <AddCredentialDialog
         open={dialogOpen}
         onOpenChange={setDialogOpen}
         nurseId={nurseId}
         onCredentialAdded={fetchCredentials}
       />
     </div>
   );
 }