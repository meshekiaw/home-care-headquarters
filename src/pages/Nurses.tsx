 import { useState, useEffect } from "react";
 import { Link } from "react-router-dom";
 import DashboardLayout from "@/components/layout/DashboardLayout";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
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
 import { Search, Plus, Eye, UserPlus, AlertTriangle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { AddNurseDialog } from "@/components/nurses/AddNurseDialog";
 
 interface Nurse {
   id: string;
   first_name: string;
   last_name: string;
   email: string | null;
   phone: string | null;
   license_number: string | null;
   license_state: string | null;
   license_expiry: string | null;
   status: string;
   created_at: string;
 }
 
 export default function Nurses() {
   const [nurses, setNurses] = useState<Nurse[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState("");
   const [dialogOpen, setDialogOpen] = useState(false);
   const { toast } = useToast();
 
   useEffect(() => {
     fetchNurses();
   }, []);
 
   async function fetchNurses() {
     try {
       const { data, error } = await supabase
         .from("nurses")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setNurses(data || []);
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
 
   const filteredNurses = nurses.filter(
     (nurse) =>
       nurse.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       nurse.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       nurse.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       nurse.license_number?.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const getStatusVariant = (status: string) => {
     switch (status) {
       case "active":
         return "default";
       case "inactive":
         return "secondary";
       case "on_leave":
         return "outline";
       default:
         return "secondary";
     }
   };
 
   const isLicenseExpiringSoon = (expiryDate: string | null) => {
     if (!expiryDate) return false;
     const expiry = new Date(expiryDate);
     const today = new Date();
     const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
     return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
   };
 
   const isLicenseExpired = (expiryDate: string | null) => {
     if (!expiryDate) return false;
     return new Date(expiryDate) < new Date();
   };
 
   const activeNurses = nurses.filter((n) => n.status === "active").length;
   const expiringLicenses = nurses.filter((n) => isLicenseExpiringSoon(n.license_expiry)).length;
   const expiredLicenses = nurses.filter((n) => isLicenseExpired(n.license_expiry)).length;
 
   return (
     <DashboardLayout>
       <div className="space-y-6">
         {/* Stats Cards */}
         <div className="grid gap-4 md:grid-cols-4">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Total Nurses</CardTitle>
               <UserPlus className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{nurses.length}</div>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Active</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-green-600">{activeNurses}</div>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Licenses Expiring</CardTitle>
               <AlertTriangle className="h-4 w-4 text-yellow-500" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-yellow-600">{expiringLicenses}</div>
               <p className="text-xs text-muted-foreground">Within 30 days</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Expired</CardTitle>
               <AlertTriangle className="h-4 w-4 text-destructive" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-destructive">{expiredLicenses}</div>
             </CardContent>
           </Card>
         </div>
 
         {/* Search and Add */}
         <div className="flex flex-col sm:flex-row gap-4 justify-between">
           <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
             <Input
               placeholder="Search nurses..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-10"
             />
           </div>
           <Button onClick={() => setDialogOpen(true)}>
             <Plus className="w-4 h-4 mr-2" />
             Add Nurse
           </Button>
         </div>
 
         {/* Nurses Table */}
         <Card>
           <CardContent className="p-0">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Name</TableHead>
                   <TableHead>License #</TableHead>
                   <TableHead>State</TableHead>
                   <TableHead>License Expiry</TableHead>
                   <TableHead>Contact</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {loading ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8">
                       Loading nurses...
                     </TableCell>
                   </TableRow>
                 ) : filteredNurses.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8">
                       No nurses found
                     </TableCell>
                   </TableRow>
                 ) : (
                   filteredNurses.map((nurse) => (
                     <TableRow key={nurse.id}>
                       <TableCell className="font-medium">
                         {nurse.first_name} {nurse.last_name}
                       </TableCell>
                       <TableCell>{nurse.license_number || "—"}</TableCell>
                       <TableCell>{nurse.license_state || "—"}</TableCell>
                       <TableCell>
                         {nurse.license_expiry ? (
                           <span
                             className={
                               isLicenseExpired(nurse.license_expiry)
                                 ? "text-destructive font-medium"
                                 : isLicenseExpiringSoon(nurse.license_expiry)
                                 ? "text-yellow-600 font-medium"
                                 : ""
                             }
                           >
                             {new Date(nurse.license_expiry).toLocaleDateString()}
                             {isLicenseExpired(nurse.license_expiry) && " (Expired)"}
                             {isLicenseExpiringSoon(nurse.license_expiry) && " (Soon)"}
                           </span>
                         ) : (
                           "—"
                         )}
                       </TableCell>
                       <TableCell>
                         <div className="text-sm">
                           {nurse.email && <div>{nurse.email}</div>}
                           {nurse.phone && <div className="text-muted-foreground">{nurse.phone}</div>}
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant={getStatusVariant(nurse.status)} className="capitalize">
                           {nurse.status.replace("_", " ")}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-right">
                         <Link to={`/nurses/${nurse.id}`}>
                           <Button variant="ghost" size="sm">
                             <Eye className="w-4 h-4 mr-1" />
                             View
                           </Button>
                         </Link>
                       </TableCell>
                     </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
       </div>
 
       <AddNurseDialog
         open={dialogOpen}
         onOpenChange={setDialogOpen}
         onNurseAdded={fetchNurses}
       />
     </DashboardLayout>
   );
 }