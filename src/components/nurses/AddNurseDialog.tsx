 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Textarea } from "@/components/ui/textarea";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";
 
 interface AddNurseDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onNurseAdded: () => void;
 }
 
 const US_STATES = [
   "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
   "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
   "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
   "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
   "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
 ];
 
 export function AddNurseDialog({ open, onOpenChange, onNurseAdded }: AddNurseDialogProps) {
   const { toast } = useToast();
   const { user } = useAuth();
   const [loading, setLoading] = useState(false);
   const [formData, setFormData] = useState({
     first_name: "",
     last_name: "",
     email: "",
     phone: "",
     address: "",
     city: "",
     state: "",
     zip_code: "",
     license_number: "",
     license_state: "",
     license_expiry: "",
     hourly_rate: "",
     notes: "",
   });
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user) return;
 
     setLoading(true);
     try {
       const { error } = await supabase.from("nurses").insert({
         user_id: user.id,
         first_name: formData.first_name,
         last_name: formData.last_name,
         email: formData.email || null,
         phone: formData.phone || null,
         address: formData.address || null,
         city: formData.city || null,
         state: formData.state || null,
         zip_code: formData.zip_code || null,
         license_number: formData.license_number || null,
         license_state: formData.license_state || null,
         license_expiry: formData.license_expiry || null,
         hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
         notes: formData.notes || null,
       });
 
       if (error) throw error;
 
       toast({
         title: "Nurse added",
         description: `${formData.first_name} ${formData.last_name} has been added successfully.`,
       });
 
       setFormData({
         first_name: "",
         last_name: "",
         email: "",
         phone: "",
         address: "",
         city: "",
         state: "",
         zip_code: "",
         license_number: "",
         license_state: "",
         license_expiry: "",
         hourly_rate: "",
         notes: "",
       });
       onOpenChange(false);
       onNurseAdded();
     } catch (error: any) {
       toast({
         title: "Error adding nurse",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Add New Nurse</DialogTitle>
         </DialogHeader>
         <form onSubmit={handleSubmit} className="space-y-6">
           {/* Personal Information */}
           <div className="space-y-4">
             <h3 className="font-medium border-b pb-2">Personal Information</h3>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="first_name">First Name *</Label>
                 <Input
                   id="first_name"
                   value={formData.first_name}
                   onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="last_name">Last Name *</Label>
                 <Input
                   id="last_name"
                   value={formData.last_name}
                   onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                   required
                 />
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="email">Email</Label>
                 <Input
                   id="email"
                   type="email"
                   value={formData.email}
                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="phone">Phone</Label>
                 <Input
                   id="phone"
                   value={formData.phone}
                   onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                 />
               </div>
             </div>
           </div>
 
           {/* Address */}
           <div className="space-y-4">
             <h3 className="font-medium border-b pb-2">Address</h3>
             <div className="space-y-2">
               <Label htmlFor="address">Street Address</Label>
               <Input
                 id="address"
                 value={formData.address}
                 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
               />
             </div>
             <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="city">City</Label>
                 <Input
                   id="city"
                   value={formData.city}
                   onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="state">State</Label>
                 <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select" />
                   </SelectTrigger>
                   <SelectContent>
                     {US_STATES.map((st) => (
                       <SelectItem key={st} value={st}>{st}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="zip_code">ZIP Code</Label>
                 <Input
                   id="zip_code"
                   value={formData.zip_code}
                   onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                 />
               </div>
             </div>
           </div>
 
           {/* License Information */}
           <div className="space-y-4">
             <h3 className="font-medium border-b pb-2">RN License Information</h3>
             <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="license_number">License Number</Label>
                 <Input
                   id="license_number"
                   value={formData.license_number}
                   onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="license_state">License State</Label>
                 <Select value={formData.license_state} onValueChange={(v) => setFormData({ ...formData, license_state: v })}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select" />
                   </SelectTrigger>
                   <SelectContent>
                     {US_STATES.map((st) => (
                       <SelectItem key={st} value={st}>{st}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="license_expiry">License Expiry</Label>
                 <Input
                   id="license_expiry"
                   type="date"
                   value={formData.license_expiry}
                   onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                 />
               </div>
             </div>
           </div>
 
           {/* Employment */}
           <div className="space-y-4">
             <h3 className="font-medium border-b pb-2">Employment</h3>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                 <Input
                   id="hourly_rate"
                   type="number"
                   step="0.01"
                   value={formData.hourly_rate}
                   onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                 />
               </div>
             </div>
             <div className="space-y-2">
               <Label htmlFor="notes">Notes</Label>
               <Textarea
                 id="notes"
                 value={formData.notes}
                 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                 rows={3}
               />
             </div>
           </div>
 
           <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={loading}>
               {loading ? "Adding..." : "Add Nurse"}
             </Button>
           </div>
         </form>
       </DialogContent>
     </Dialog>
   );
 }