 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Phone, Mail, MapPin, Calendar, DollarSign, FileText } from "lucide-react";
 
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
 
 interface NurseOverviewTabProps {
   nurse: Nurse;
 }
 
 export function NurseOverviewTab({ nurse }: NurseOverviewTabProps) {
   const formatDate = (date: string | null) => {
     if (!date) return "Not specified";
     return new Date(date).toLocaleDateString("en-US", {
       year: "numeric",
       month: "long",
       day: "numeric",
     });
   };
 
   const isLicenseExpired = (expiryDate: string | null) => {
     if (!expiryDate) return false;
     return new Date(expiryDate) < new Date();
   };
 
   const isLicenseExpiringSoon = (expiryDate: string | null) => {
     if (!expiryDate) return false;
     const expiry = new Date(expiryDate);
     const today = new Date();
     const daysUntilExpiry = Math.ceil(
       (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
     );
     return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
   };
 
   return (
     <div className="grid gap-6 md:grid-cols-2">
       {/* Contact Information */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">Contact Information</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <Mail className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-sm text-muted-foreground">Email</p>
               <p className="font-medium">{nurse.email || "Not provided"}</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <Phone className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-sm text-muted-foreground">Phone</p>
               <p className="font-medium">{nurse.phone || "Not provided"}</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <MapPin className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-sm text-muted-foreground">Address</p>
               <p className="font-medium">
                 {nurse.address
                   ? `${nurse.address}, ${nurse.city}, ${nurse.state} ${nurse.zip_code}`
                   : "Not provided"}
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* License Information */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">RN License</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <FileText className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-sm text-muted-foreground">License Number</p>
               <p className="font-medium">{nurse.license_number || "Not provided"}</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <MapPin className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-sm text-muted-foreground">License State</p>
               <p className="font-medium">{nurse.license_state || "Not provided"}</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <Calendar className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-sm text-muted-foreground">License Expiry</p>
               <p
                 className={`font-medium ${
                   isLicenseExpired(nurse.license_expiry)
                     ? "text-destructive"
                     : isLicenseExpiringSoon(nurse.license_expiry)
                     ? "text-yellow-600"
                     : ""
                 }`}
               >
                 {formatDate(nurse.license_expiry)}
                 {isLicenseExpired(nurse.license_expiry) && " (Expired)"}
                 {isLicenseExpiringSoon(nurse.license_expiry) && " (Expiring Soon)"}
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Employment */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">Employment</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <DollarSign className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-sm text-muted-foreground">Hourly Rate</p>
               <p className="font-medium">
                 {nurse.hourly_rate ? `$${nurse.hourly_rate.toFixed(2)}/hr` : "Not set"}
               </p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
               <Calendar className="w-5 h-5 text-primary" />
             </div>
             <div>
               <p className="text-sm text-muted-foreground">Added</p>
               <p className="font-medium">{formatDate(nurse.created_at)}</p>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Notes */}
       {nurse.notes && (
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Notes</CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-muted-foreground whitespace-pre-wrap">{nurse.notes}</p>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }