 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { 
   Plus, 
   FileText, 
   Send, 
   CheckCircle, 
   Clock, 
   AlertCircle,
   Eye,
   Edit,
   Trash2,
   PenTool,
   Mail,
   Users,
   FileUp
 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { prebuiltFormTemplates, FormTemplate } from "@/data/admissionFormTemplates";
 import { FormFieldRenderer, FormField } from "./FormFieldRenderer";
 import { FormBuilder } from "./FormBuilder";
 import { SignaturePad } from "./SignaturePad";
 
 interface FormSubmission {
   id: string;
   template_id: string;
   form_data: any;
   status: string;
   created_at: string;
   submitted_at: string | null;
   completed_at: string | null;
   template?: {
     name: string;
     category: string;
   };
   signatures?: FormSignature[];
 }
 
 interface FormSignature {
   id: string;
   signer_type: string;
   signer_name: string;
   signer_email: string | null;
   status: string;
   signed_at: string | null;
   signing_method: string | null;
 }
 
 interface AdmissionFormsTabProps {
   clientId: string;
 }
 
 export function AdmissionFormsTab({ clientId }: AdmissionFormsTabProps) {
   const { toast } = useToast();
   const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
   const [templates, setTemplates] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   
   // Dialog states
   const [newFormOpen, setNewFormOpen] = useState(false);
   const [fillFormOpen, setFillFormOpen] = useState(false);
   const [viewFormOpen, setViewFormOpen] = useState(false);
   const [signatureRequestOpen, setSignatureRequestOpen] = useState(false);
   const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
   
   const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
   const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
   const [formData, setFormData] = useState<Record<string, any>>({});
   const [saving, setSaving] = useState(false);
   
   // Signature request state
   const [signatureRequests, setSignatureRequests] = useState<{
     signer_type: string;
     signer_name: string;
     signer_email: string;
     signing_method: 'in_app' | 'email_link';
   }[]>([]);
   
   // New template state
   const [newTemplate, setNewTemplate] = useState({
     name: '',
     description: '',
     category: 'admission' as const,
     fields: [] as FormField[],
   });
 
   useEffect(() => {
     fetchData();
   }, [clientId]);
 
   async function fetchData() {
     try {
       // Fetch submissions for this client
       const { data: submissionsData, error: submissionsError } = await supabase
         .from('form_submissions')
         .select(`
           *,
           template:form_templates(name, category)
         `)
         .eq('client_id', clientId)
         .order('created_at', { ascending: false });
 
       if (submissionsError) throw submissionsError;
 
       // Fetch signatures for each submission
       const submissionsWithSignatures = await Promise.all(
         (submissionsData || []).map(async (submission) => {
           const { data: signatures } = await supabase
             .from('form_signatures')
             .select('*')
             .eq('submission_id', submission.id);
           return { ...submission, signatures: signatures || [] };
         })
       );
 
       setSubmissions(submissionsWithSignatures as FormSubmission[]);
 
       // Fetch custom templates
       const { data: templatesData, error: templatesError } = await supabase
         .from('form_templates')
         .select('*')
         .eq('is_active', true)
         .order('name');
 
       if (templatesError) throw templatesError;
       setTemplates(templatesData || []);
     } catch (error: any) {
       toast({
         title: "Error loading forms",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   }
 
   const handleSelectTemplate = (templateId: string) => {
     // Check prebuilt first
     const prebuilt = prebuiltFormTemplates.find(t => t.id === templateId);
     if (prebuilt) {
       setSelectedTemplate(prebuilt);
       setFormData({});
       setNewFormOpen(false);
       setFillFormOpen(true);
       return;
     }
     
     // Check custom templates
     const custom = templates.find(t => t.id === templateId);
     if (custom) {
       setSelectedTemplate({
         id: custom.id,
         name: custom.name,
         description: custom.description || '',
         category: custom.category,
         fields: custom.fields as FormField[],
       });
       setFormData({});
       setNewFormOpen(false);
       setFillFormOpen(true);
     }
   };
 
   const handleFieldChange = (fieldId: string, value: any) => {
     setFormData(prev => ({ ...prev, [fieldId]: value }));
   };
 
   const handleSaveForm = async (status: 'draft' | 'pending_signatures') => {
     if (!selectedTemplate) return;
     setSaving(true);
 
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("You must be logged in");
 
       // First, ensure the template exists in the database
       let templateId = selectedTemplate.id;
       
       // Check if it's a prebuilt template (not a UUID)
       const isPrebuilt = !selectedTemplate.id.includes('-') || selectedTemplate.id.length < 30;
       
       if (isPrebuilt) {
         // Create the template in the database
       const { data: newTemplateData, error: templateError } = await supabase
           .from('form_templates')
         .insert([{
             user_id: user.id,
             name: selectedTemplate.name,
             description: selectedTemplate.description,
             template_type: 'pre-built',
             category: selectedTemplate.category,
           fields: selectedTemplate.fields as any,
         }])
           .select()
           .single();
 
         if (templateError) throw templateError;
         templateId = newTemplateData.id;
       }
 
       // Create the submission
       const { data: submission, error: submissionError } = await supabase
         .from('form_submissions')
         .insert({
           user_id: user.id,
           client_id: clientId,
           template_id: templateId,
           form_data: formData,
           status,
           submitted_at: status === 'pending_signatures' ? new Date().toISOString() : null,
         })
         .select()
         .single();
 
       if (submissionError) throw submissionError;
 
       toast({
         title: status === 'draft' ? "Form saved as draft" : "Form submitted for signatures",
       });

       setFillFormOpen(false);
       setSelectedTemplate(null);
       setFormData({});

       if (status === 'pending_signatures') {
         setSelectedSubmission({ ...submission, template: { name: selectedTemplate.name, category: selectedTemplate.category } } as FormSubmission);
         setSignatureRequestOpen(true);
       }
       
       fetchData();
     } catch (error: any) {
       toast({
         title: "Error saving form",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   };
 
   const handleAddSignatureRequest = () => {
     setSignatureRequests(prev => [...prev, {
       signer_type: 'client',
       signer_name: '',
       signer_email: '',
       signing_method: 'email_link',
     }]);
   };
 
   const handleSendSignatureRequests = async () => {
     if (!selectedSubmission || signatureRequests.length === 0) return;
     setSaving(true);
 
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("You must be logged in");
 
       // Create signature requests
       const { error } = await supabase.from('form_signatures').insert(
         signatureRequests.map(req => ({
           user_id: user.id,
           submission_id: selectedSubmission.id,
           signer_type: req.signer_type,
           signer_name: req.signer_name,
           signer_email: req.signer_email || null,
           signing_method: req.signing_method,
           status: req.signing_method === 'email_link' ? 'sent' : 'pending',
           token: req.signing_method === 'email_link' ? crypto.randomUUID() : null,
           token_expires_at: req.signing_method === 'email_link' 
             ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
             : null,
         }))
       );
 
       if (error) throw error;
 
       toast({
         title: "Signature requests sent",
         description: `${signatureRequests.length} signature request(s) created`,
       });
 
       setSignatureRequestOpen(false);
       setSignatureRequests([]);
       setSelectedSubmission(null);
       fetchData();
     } catch (error: any) {
       toast({
         title: "Error sending requests",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   };
 
   const handleCreateTemplate = async () => {
     if (!newTemplate.name || newTemplate.fields.length === 0) return;
     setSaving(true);
 
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("You must be logged in");
 
       const { error } = await supabase.from('form_templates').insert([{
         user_id: user.id,
         name: newTemplate.name,
         description: newTemplate.description,
         template_type: 'custom',
         category: newTemplate.category,
         fields: newTemplate.fields as any,
       }]);
 
       if (error) throw error;
 
       toast({ title: "Template created successfully!" });
       setCreateTemplateOpen(false);
       setNewTemplate({ name: '', description: '', category: 'admission', fields: [] });
       fetchData();
     } catch (error: any) {
       toast({
         title: "Error creating template",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   };
 
   const handleViewSubmission = (submission: FormSubmission) => {
     setSelectedSubmission(submission);
     setViewFormOpen(true);
   };
 
   const handleDeleteSubmission = async (id: string) => {
     try {
       const { error } = await supabase
         .from('form_submissions')
         .delete()
         .eq('id', id);
 
       if (error) throw error;
       toast({ title: "Form deleted" });
       fetchData();
     } catch (error: any) {
       toast({
         title: "Error deleting form",
         description: error.message,
         variant: "destructive",
       });
     }
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case 'draft':
         return <Badge variant="secondary"><Edit className="w-3 h-3 mr-1" />Draft</Badge>;
       case 'pending_signatures':
         return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Pending Signatures</Badge>;
       case 'partially_signed':
         return <Badge variant="outline" className="text-primary border-primary"><PenTool className="w-3 h-3 mr-1" />Partially Signed</Badge>;
       case 'completed':
         return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
       default:
         return <Badge variant="secondary">{status}</Badge>;
     }
   };
 
   const formatDate = (date: string) => {
     return new Date(date).toLocaleDateString('en-US', {
       month: 'short',
       day: 'numeric',
       year: 'numeric',
     });
   };
 
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
           <h3 className="text-lg font-semibold">Admission Forms</h3>
           <p className="text-sm text-muted-foreground">Manage intake forms and collect signatures</p>
         </div>
         <div className="flex gap-2">
           <Button variant="outline" onClick={() => setCreateTemplateOpen(true)}>
             <Plus className="w-4 h-4 mr-2" />
             Create Template
           </Button>
           <Button onClick={() => setNewFormOpen(true)}>
             <FileText className="w-4 h-4 mr-2" />
             New Form
           </Button>
         </div>
       </div>
 
       {submissions.length === 0 ? (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12 text-center">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
               <FileText className="w-8 h-8 text-primary" />
             </div>
             <h3 className="text-lg font-semibold mb-2">No Forms Yet</h3>
             <p className="text-muted-foreground mb-4 max-w-sm">
               Start by creating a new admission form from a template or build your own.
             </p>
             <Button onClick={() => setNewFormOpen(true)}>
               <Plus className="w-4 h-4 mr-2" />
               Create First Form
             </Button>
           </CardContent>
         </Card>
       ) : (
         <div className="grid gap-4">
           {submissions.map((submission) => (
             <Card key={submission.id}>
               <CardContent className="flex items-center justify-between p-4">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                     <FileText className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-medium">{submission.template?.name || 'Unnamed Form'}</p>
                     <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                       <span>Created {formatDate(submission.created_at)}</span>
                       {submission.signatures && submission.signatures.length > 0 && (
                         <span className="flex items-center gap-1">
                           <Users className="w-3 h-3" />
                           {submission.signatures.filter(s => s.status === 'signed').length}/{submission.signatures.length} signed
                         </span>
                       )}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   {getStatusBadge(submission.status)}
                   <div className="flex items-center gap-1">
                     <Button variant="ghost" size="icon" onClick={() => handleViewSubmission(submission)}>
                       <Eye className="w-4 h-4" />
                     </Button>
                     {submission.status === 'draft' && (
                       <Button 
                         variant="ghost" 
                         size="icon"
                         onClick={() => {
                           setSelectedSubmission(submission);
                           setSignatureRequestOpen(true);
                         }}
                       >
                         <Send className="w-4 h-4" />
                       </Button>
                     )}
                     <Button 
                       variant="ghost" 
                       size="icon"
                       className="text-destructive hover:text-destructive"
                       onClick={() => handleDeleteSubmission(submission.id)}
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
 
       {/* New Form Dialog */}
       <Dialog open={newFormOpen} onOpenChange={setNewFormOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Select Form Template</DialogTitle>
             <DialogDescription>Choose a pre-built template or one of your custom forms</DialogDescription>
           </DialogHeader>
           <Tabs defaultValue="prebuilt">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="prebuilt">Pre-built Templates</TabsTrigger>
               <TabsTrigger value="custom">My Templates</TabsTrigger>
             </TabsList>
             <TabsContent value="prebuilt" className="mt-4">
               <div className="grid gap-3">
                 {prebuiltFormTemplates.map((template) => (
                   <Card 
                     key={template.id} 
                     className="cursor-pointer hover:border-primary transition-colors"
                     onClick={() => handleSelectTemplate(template.id)}
                   >
                     <CardContent className="flex items-center gap-4 p-4">
                       <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                         <FileText className="w-5 h-5 text-primary" />
                       </div>
                       <div className="flex-1">
                         <p className="font-medium">{template.name}</p>
                         <p className="text-sm text-muted-foreground">{template.description}</p>
                       </div>
                       <Badge variant="outline" className="capitalize">{template.category}</Badge>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             </TabsContent>
             <TabsContent value="custom" className="mt-4">
               {templates.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">
                   <p>No custom templates yet.</p>
                   <Button 
                     variant="link" 
                     onClick={() => {
                       setNewFormOpen(false);
                       setCreateTemplateOpen(true);
                     }}
                   >
                     Create your first template
                   </Button>
                 </div>
               ) : (
                 <div className="grid gap-3">
                   {templates.map((template) => (
                     <Card 
                       key={template.id} 
                       className="cursor-pointer hover:border-primary transition-colors"
                       onClick={() => handleSelectTemplate(template.id)}
                     >
                       <CardContent className="flex items-center gap-4 p-4">
                         <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                           <FileText className="w-5 h-5" />
                         </div>
                         <div className="flex-1">
                           <p className="font-medium">{template.name}</p>
                           <p className="text-sm text-muted-foreground">{template.description || 'Custom template'}</p>
                         </div>
                         <Badge variant="outline" className="capitalize">{template.category}</Badge>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               )}
             </TabsContent>
           </Tabs>
         </DialogContent>
       </Dialog>
 
       {/* Fill Form Dialog */}
       <Dialog open={fillFormOpen} onOpenChange={setFillFormOpen}>
         <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>{selectedTemplate?.name}</DialogTitle>
             <DialogDescription>{selectedTemplate?.description}</DialogDescription>
           </DialogHeader>
           {selectedTemplate && (
             <div className="grid grid-cols-2 gap-4">
               {selectedTemplate.fields.map((field) => (
                 <FormFieldRenderer
                   key={field.id}
                   field={field}
                   value={formData[field.id]}
                   onChange={handleFieldChange}
                 />
               ))}
             </div>
           )}
           <DialogFooter className="gap-2">
             <Button variant="outline" onClick={() => setFillFormOpen(false)}>
               Cancel
             </Button>
             <Button variant="secondary" onClick={() => handleSaveForm('draft')} disabled={saving}>
               Save as Draft
             </Button>
             <Button onClick={() => handleSaveForm('pending_signatures')} disabled={saving}>
               <Send className="w-4 h-4 mr-2" />
               Submit for Signatures
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* View Form Dialog */}
       <Dialog open={viewFormOpen} onOpenChange={setViewFormOpen}>
         <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>{selectedSubmission?.template?.name}</DialogTitle>
             <DialogDescription>
               Submitted on {selectedSubmission && formatDate(selectedSubmission.created_at)}
             </DialogDescription>
           </DialogHeader>
           {selectedSubmission && (
             <div className="space-y-6">
               <div className="grid gap-4">
                 {Object.entries(selectedSubmission.form_data).map(([key, value]) => (
                   <div key={key} className="space-y-1">
                     <Label className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</Label>
                     {typeof value === 'string' && value.startsWith('data:image') ? (
                       <div className="border rounded p-2 bg-muted">
                         <img src={value} alt="Signature" className="max-h-20" />
                       </div>
                     ) : typeof value === 'boolean' ? (
                       <p>{value ? 'Yes' : 'No'}</p>
                     ) : (
                       <p className="font-medium">{String(value) || '-'}</p>
                     )}
                   </div>
                 ))}
               </div>
               
               {selectedSubmission.signatures && selectedSubmission.signatures.length > 0 && (
                 <div className="border-t pt-4">
                   <h4 className="font-medium mb-3">Signatures</h4>
                   <div className="space-y-2">
                     {selectedSubmission.signatures.map((sig) => (
                       <div key={sig.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                         <div>
                           <p className="font-medium">{sig.signer_name}</p>
                           <p className="text-sm text-muted-foreground capitalize">{sig.signer_type}</p>
                         </div>
                         {sig.status === 'signed' ? (
                           <Badge className="bg-success text-success-foreground">
                             <CheckCircle className="w-3 h-3 mr-1" />
                             Signed {sig.signed_at && formatDate(sig.signed_at)}
                           </Badge>
                         ) : (
                           <Badge variant="outline">
                             <Clock className="w-3 h-3 mr-1" />
                             Pending
                           </Badge>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           )}
         </DialogContent>
       </Dialog>
 
       {/* Signature Request Dialog */}
       <Dialog open={signatureRequestOpen} onOpenChange={setSignatureRequestOpen}>
         <DialogContent className="max-w-lg">
           <DialogHeader>
             <DialogTitle>Request Signatures</DialogTitle>
             <DialogDescription>Add signers who need to sign this form</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             {signatureRequests.map((req, index) => (
               <Card key={index}>
                 <CardContent className="p-4 space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-medium">Signer {index + 1}</span>
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-6 w-6"
                       onClick={() => setSignatureRequests(prev => prev.filter((_, i) => i !== index))}
                     >
                       <Trash2 className="w-3 h-3" />
                     </Button>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                       <Label className="text-xs">Type</Label>
                       <Select
                         value={req.signer_type}
                         onValueChange={(val) => {
                           const newReqs = [...signatureRequests];
                           newReqs[index].signer_type = val;
                           setSignatureRequests(newReqs);
                         }}
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="client">Client</SelectItem>
                           <SelectItem value="guardian">Guardian</SelectItem>
                           <SelectItem value="caregiver">Caregiver</SelectItem>
                           <SelectItem value="agency_rep">Agency Rep</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="space-y-1">
                       <Label className="text-xs">Method</Label>
                       <Select
                         value={req.signing_method}
                         onValueChange={(val) => {
                           const newReqs = [...signatureRequests];
                           newReqs[index].signing_method = val as 'in_app' | 'email_link';
                           setSignatureRequests(newReqs);
                         }}
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="email_link">
                             <div className="flex items-center gap-1">
                               <Mail className="w-3 h-3" />
                               Email Link
                             </div>
                           </SelectItem>
                           <SelectItem value="in_app">
                             <div className="flex items-center gap-1">
                               <PenTool className="w-3 h-3" />
                               Sign In-App
                             </div>
                           </SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <div className="space-y-1">
                     <Label className="text-xs">Name</Label>
                     <Input
                       value={req.signer_name}
                       onChange={(e) => {
                         const newReqs = [...signatureRequests];
                         newReqs[index].signer_name = e.target.value;
                         setSignatureRequests(newReqs);
                       }}
                       placeholder="Full name"
                     />
                   </div>
                   {req.signing_method === 'email_link' && (
                     <div className="space-y-1">
                       <Label className="text-xs">Email</Label>
                       <Input
                         type="email"
                         value={req.signer_email}
                         onChange={(e) => {
                           const newReqs = [...signatureRequests];
                           newReqs[index].signer_email = e.target.value;
                           setSignatureRequests(newReqs);
                         }}
                         placeholder="email@example.com"
                       />
                     </div>
                   )}
                 </CardContent>
               </Card>
             ))}
             
             <Button variant="outline" className="w-full" onClick={handleAddSignatureRequest}>
               <Plus className="w-4 h-4 mr-2" />
               Add Signer
             </Button>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setSignatureRequestOpen(false)}>
               Cancel
             </Button>
             <Button 
               onClick={handleSendSignatureRequests} 
               disabled={saving || signatureRequests.length === 0 || signatureRequests.some(r => !r.signer_name)}
             >
               <Send className="w-4 h-4 mr-2" />
               Send Requests
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Create Template Dialog */}
       <Dialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen}>
         <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Create Form Template</DialogTitle>
             <DialogDescription>Build a custom form template with the fields you need</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Template Name *</Label>
                 <Input
                   value={newTemplate.name}
                   onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                   placeholder="e.g., Custom Intake Form"
                 />
               </div>
               <div className="space-y-2">
                 <Label>Category</Label>
                 <Select
                   value={newTemplate.category}
                   onValueChange={(val) => setNewTemplate(prev => ({ ...prev, category: val as any }))}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="admission">Admission</SelectItem>
                     <SelectItem value="consent">Consent</SelectItem>
                     <SelectItem value="medical">Medical</SelectItem>
                     <SelectItem value="legal">Legal</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
             <div className="space-y-2">
               <Label>Description</Label>
               <Textarea
                 value={newTemplate.description}
                 onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                 placeholder="Describe what this form is for..."
                 rows={2}
               />
             </div>
             
             <FormBuilder 
               fields={newTemplate.fields} 
               onChange={(fields) => setNewTemplate(prev => ({ ...prev, fields }))} 
             />
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setCreateTemplateOpen(false)}>
               Cancel
             </Button>
             <Button 
               onClick={handleCreateTemplate} 
               disabled={saving || !newTemplate.name || newTemplate.fields.length === 0}
             >
               Create Template
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }