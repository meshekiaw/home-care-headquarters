 import { useState, useEffect } from "react";
 import { useParams, Link } from "react-router-dom";
 import DashboardLayout from "@/components/layout/DashboardLayout";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Badge } from "@/components/ui/badge";
 import { Skeleton } from "@/components/ui/skeleton";
 import {
   ArrowLeft,
   User,
   Phone,
   Mail,
   MapPin,
   AlertCircle,
   FileText,
   Shield,
 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { NurseOverviewTab } from "@/components/nurses/NurseOverviewTab";
 import { NurseCredentialsTab } from "@/components/nurses/NurseCredentialsTab";
 import { AssignedClientsTab } from "@/components/nurses/AssignedClientsTab";
 import { ExpiringAssessmentsTab } from "@/components/nurses/ExpiringAssessmentsTab";
 import { HandoffQueueTab } from "@/components/nurses/HandoffQueueTab";
 import { Users, ClipboardList, HandHelping } from "lucide-react";
 
 interface Nurse {
   id: string;
   first_name: string;
   last_name: string;
   email: string | null;
   phone: string | null;
   address: string | null;
   city: string | null;
   state: string | null;
   zip_code: string | null;
   license_number: string | null;
   license_state: string | null;
   license_expiry: string | null;
   specializations: string[] | null;
   hourly_rate: number | null;
   status: string;
   notes: string | null;
   created_at: string;
 }
 
 export default function NurseProfile() {
   const { id } = useParams<{ id: string }>();
   const { toast } = useToast();
   const [nurse, setNurse] = useState<Nurse | null>(null);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (id) {
       fetchNurse();
     }
   }, [id]);
 
   async function fetchNurse() {
     try {
       const { data, error } = await supabase
         .from("nurses")
         .select("*")
         .eq("id", id)
         .maybeSingle();
 
       if (error) throw error;
 
       if (!data) {
         toast({
           title: "Nurse not found",
           description: "The nurse you're looking for doesn't exist.",
           variant: "destructive",
         });
         return;
       }
 
       setNurse(data);
     } catch (error: any) {
       toast({
         title: "Error loading nurse",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }
 
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
 
   if (loading) {
     return (
       <DashboardLayout>
         <div className="space-y-6">
           <div className="flex items-center gap-4">
             <Skeleton className="h-10 w-10" />
             <div className="space-y-2">
               <Skeleton className="h-8 w-48" />
               <Skeleton className="h-4 w-32" />
             </div>
           </div>
           <Skeleton className="h-96 w-full" />
         </div>
       </DashboardLayout>
     );
   }
 
   if (!nurse) {
     return (
       <DashboardLayout>
         <div className="flex flex-col items-center justify-center py-12 text-center">
           <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
             <AlertCircle className="w-8 h-8 text-destructive" />
           </div>
           <h3 className="text-lg font-semibold mb-2">Nurse Not Found</h3>
           <p className="text-muted-foreground mb-4">
             The nurse you're looking for doesn't exist.
           </p>
           <Link to="/nurses">
             <Button>
               <ArrowLeft className="w-4 h-4 mr-2" />
               Back to Nurses
             </Button>
           </Link>
         </div>
       </DashboardLayout>
     );
   }
 
   return (
     <DashboardLayout>
       <div className="space-y-6">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
           <div className="flex items-start gap-4">
             <Link to="/nurses">
               <Button variant="ghost" size="icon" className="mt-1">
                 <ArrowLeft className="w-5 h-5" />
               </Button>
             </Link>
             <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                 <span className="text-2xl font-semibold text-primary">
                   {nurse.first_name.charAt(0)}
                   {nurse.last_name.charAt(0)}
                 </span>
               </div>
               <div>
                 <div className="flex items-center gap-3">
                   <h1 className="text-2xl font-bold">
                     {nurse.first_name} {nurse.last_name}, RN
                   </h1>
                   <Badge variant={getStatusVariant(nurse.status)} className="capitalize">
                     {nurse.status.replace("_", " ")}
                   </Badge>
                 </div>
                 <div className="flex items-center gap-4 mt-1 text-muted-foreground">
                   {nurse.license_number && (
                     <span>License: {nurse.license_number}</span>
                   )}
                   {nurse.city && nurse.state && (
                     <span className="flex items-center gap-1">
                       <MapPin className="w-3.5 h-3.5" />
                       {nurse.city}, {nurse.state}
                     </span>
                   )}
                 </div>
               </div>
             </div>
           </div>
         </div>
 
 
          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:w-auto lg:inline-grid">
             <TabsTrigger value="overview" className="flex items-center gap-2">
               <User className="w-4 h-4" />
               Overview
             </TabsTrigger>
             <TabsTrigger value="credentials" className="flex items-center gap-2">
               <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Credentials</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Clients</span>
              </TabsTrigger>
              <TabsTrigger value="assessments" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Assessments</span>
              </TabsTrigger>
              <TabsTrigger value="handoffs" className="flex items-center gap-2">
                <HandHelping className="w-4 h-4" />
                <span className="hidden sm:inline">Handoffs</span>
             </TabsTrigger>
           </TabsList>
 
           <TabsContent value="overview">
             <NurseOverviewTab nurse={nurse} />
           </TabsContent>
 
           <TabsContent value="credentials">
             <NurseCredentialsTab nurseId={nurse.id} />
           </TabsContent>
 
            <TabsContent value="clients">
              <AssignedClientsTab nurseId={nurse.id} />
            </TabsContent>
 
            <TabsContent value="assessments">
              <ExpiringAssessmentsTab nurseId={nurse.id} />
            </TabsContent>
 
            <TabsContent value="handoffs">
              <HandoffQueueTab nurseId={nurse.id} />
            </TabsContent>
         </Tabs>
       </div>
     </DashboardLayout>
   );
 }