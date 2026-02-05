 import { useState, useRef } from "react";
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
 import { Upload, X, FileText } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { useAuth } from "@/contexts/AuthContext";
 
 interface AddCredentialDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   nurseId: string;
   onCredentialAdded: () => void;
 }
 
 const CREDENTIAL_TYPES = [
   { value: "rn_license", label: "RN License" },
   { value: "bls_cpr", label: "BLS/CPR Certification" },
   { value: "specialty_cert", label: "Specialty Certification" },
   { value: "tb_test", label: "TB Test" },
   { value: "background_check", label: "Background Check" },
   { value: "other", label: "Other" },
 ];
 
 export function AddCredentialDialog({
   open,
   onOpenChange,
   nurseId,
   onCredentialAdded,
 }: AddCredentialDialogProps) {
   const { toast } = useToast();
   const { user } = useAuth();
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [loading, setLoading] = useState(false);
   const [selectedFile, setSelectedFile] = useState<File | null>(null);
   const [formData, setFormData] = useState({
     credential_type: "",
     credential_name: "",
     credential_number: "",
     issuing_organization: "",
     issue_date: "",
     expiry_date: "",
     notes: "",
   });
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       // Limit file size to 10MB
       if (file.size > 10 * 1024 * 1024) {
         toast({
           title: "File too large",
           description: "Please select a file under 10MB.",
           variant: "destructive",
         });
         return;
       }
       setSelectedFile(file);
     }
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user) return;
 
     setLoading(true);
     try {
       let documentUrl: string | null = null;
 
       // Upload file if selected
       if (selectedFile) {
         const fileExt = selectedFile.name.split(".").pop();
         const fileName = `${user.id}/${nurseId}/${Date.now()}.${fileExt}`;
 
         const { error: uploadError, data: uploadData } = await supabase.storage
           .from("nurse-credentials")
           .upload(fileName, selectedFile);
 
         if (uploadError) throw uploadError;
 
         // Get public URL
         const { data: urlData } = supabase.storage
           .from("nurse-credentials")
           .getPublicUrl(fileName);
 
         documentUrl = urlData.publicUrl;
       }
 
       // Insert credential record
       const { error } = await supabase.from("nurse_credentials").insert({
         user_id: user.id,
         nurse_id: nurseId,
         credential_type: formData.credential_type,
         credential_name: formData.credential_name,
         credential_number: formData.credential_number || null,
         issuing_organization: formData.issuing_organization || null,
          issue_date: formData.issue_date ? formData.issue_date : null,
          expiry_date: formData.expiry_date ? formData.expiry_date : null,
         document_url: documentUrl,
         notes: formData.notes || null,
       });
 
       if (error) throw error;
 
       toast({
         title: "Credential added",
         description: `${formData.credential_name} has been added successfully.`,
       });
 
       // Reset form
       setFormData({
         credential_type: "",
         credential_name: "",
         credential_number: "",
         issuing_organization: "",
         issue_date: "",
         expiry_date: "",
         notes: "",
       });
       setSelectedFile(null);
       onOpenChange(false);
       onCredentialAdded();
     } catch (error: any) {
       toast({
         title: "Error adding credential",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Add Credential</DialogTitle>
         </DialogHeader>
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="credential_type">Credential Type *</Label>
             <Select
               value={formData.credential_type}
               onValueChange={(v) => setFormData({ ...formData, credential_type: v })}
               required
             >
               <SelectTrigger>
                 <SelectValue placeholder="Select type" />
               </SelectTrigger>
               <SelectContent>
                 {CREDENTIAL_TYPES.map((type) => (
                   <SelectItem key={type.value} value={type.value}>
                     {type.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="credential_name">Credential Name *</Label>
             <Input
               id="credential_name"
               value={formData.credential_name}
               onChange={(e) => setFormData({ ...formData, credential_name: e.target.value })}
               placeholder="e.g., Registered Nurse License"
               required
             />
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="credential_number">Credential Number</Label>
               <Input
                 id="credential_number"
                 value={formData.credential_number}
                 onChange={(e) => setFormData({ ...formData, credential_number: e.target.value })}
                 placeholder="License/Cert #"
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="issuing_organization">Issuing Organization</Label>
               <Input
                 id="issuing_organization"
                 value={formData.issuing_organization}
                 onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
                 placeholder="e.g., State Board of Nursing"
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
 
           {/* File Upload */}
           <div className="space-y-2">
             <Label>Document (Optional)</Label>
             <input
               ref={fileInputRef}
               type="file"
               accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
               onChange={handleFileSelect}
               className="hidden"
             />
             {selectedFile ? (
               <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                 <FileText className="w-5 h-5 text-primary" />
                 <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   onClick={() => setSelectedFile(null)}
                 >
                   <X className="w-4 h-4" />
                 </Button>
               </div>
             ) : (
               <Button
                 type="button"
                 variant="outline"
                 className="w-full"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <Upload className="w-4 h-4 mr-2" />
                 Upload Document
               </Button>
             )}
             <p className="text-xs text-muted-foreground">
               PDF, JPG, PNG, DOC up to 10MB
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="notes">Notes</Label>
             <Textarea
               id="notes"
               value={formData.notes}
               onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
               rows={2}
             />
           </div>
 
           <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={loading || !formData.credential_type || !formData.credential_name}>
               {loading ? "Adding..." : "Add Credential"}
             </Button>
           </div>
         </form>
       </DialogContent>
     </Dialog>
   );
 }