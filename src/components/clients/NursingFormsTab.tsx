import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Eye,
  Edit,
  Trash2,
  PenTool,
  Upload,
  Stethoscope,
  ClipboardList,
  FileUp,
  ExternalLink,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { nursingFormTemplates, NursingFormTemplate } from "@/data/nursingFormTemplates";
import { FormFieldRenderer, FormField } from "@/components/forms/FormFieldRenderer";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { SignaturePad } from "@/components/forms/SignaturePad";

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
    template_type: string;
  };
  signatures?: FormSignature[];
}

interface FormSignature {
  id: string;
  signer_type: string;
  signer_name: string;
  status: string;
  signed_at: string | null;
}

interface UploadedForm {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  category: string;
  created_at: string;
}

interface NursingFormsTabProps {
  clientId: string;
}

export function NursingFormsTab({ clientId }: NursingFormsTabProps) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [uploadedForms, setUploadedForms] = useState<UploadedForm[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("forms");
  
  // Dialog states
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [fillFormOpen, setFillFormOpen] = useState(false);
  const [viewFormOpen, setViewFormOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [viewUploadedFormOpen, setViewUploadedFormOpen] = useState(false);
  const [selectedUploadedForm, setSelectedUploadedForm] = useState<UploadedForm | null>(null);
  
  const [selectedTemplate, setSelectedTemplate] = useState<NursingFormTemplate | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: 'assessment',
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  
  // New template state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'assessment' as const,
    fields: [] as FormField[],
  });

  useEffect(() => {
    fetchData();
  }, [clientId]);

  async function fetchData() {
    try {
      // Fetch nursing form submissions for this client
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('form_submissions')
        .select(`
          *,
          template:form_templates(name, category, template_type)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Filter to only nursing-related forms
      const nursingSubmissions = (submissionsData || []).filter(sub => 
        sub.template?.template_type === 'nursing' || 
        sub.template?.category?.includes('assessment') ||
        sub.template?.category?.includes('visit') ||
        sub.template?.category?.includes('supervisory') ||
        sub.template?.category?.includes('discharge') ||
        sub.template?.category?.includes('oasis')
      );

      // Fetch signatures for each submission
      const submissionsWithSignatures = await Promise.all(
        nursingSubmissions.map(async (submission) => {
          const { data: signatures } = await supabase
            .from('form_signatures')
            .select('*')
            .eq('submission_id', submission.id);
          return { ...submission, signatures: signatures || [] };
        })
      );

      setSubmissions(submissionsWithSignatures as FormSubmission[]);

      // Fetch custom nursing templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('is_active', true)
        .eq('template_type', 'nursing')
        .order('name');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch uploaded forms
      const { data: uploadedData, error: uploadedError } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .eq('category', 'nursing_form')
        .order('created_at', { ascending: false });

      if (uploadedError) throw uploadedError;
      setUploadedForms((uploadedData || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        description: null,
        file_url: doc.file_url,
        file_type: doc.file_type,
        category: 'nursing_form',
        created_at: doc.created_at,
      })));
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
    // Check prebuilt nursing templates first
    const prebuilt = nursingFormTemplates.find(t => t.id === templateId);
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

  const handleSaveForm = async (status: 'draft' | 'completed') => {
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
            template_type: 'nursing',
            category: selectedTemplate.category,
            fields: selectedTemplate.fields as any,
          }])
          .select()
          .single();

        if (templateError) throw templateError;
        templateId = newTemplateData.id;
      }

      // Create the submission
      const { error: submissionError } = await supabase
        .from('form_submissions')
        .insert({
          user_id: user.id,
          client_id: clientId,
          template_id: templateId,
          form_data: formData,
          status,
          submitted_at: status === 'completed' ? new Date().toISOString() : null,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        });

      if (submissionError) throw submissionError;

      toast({
        title: status === 'draft' ? "Form saved as draft" : "Form completed",
      });

      setFillFormOpen(false);
      setSelectedTemplate(null);
      setFormData({});
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

  const handleFileUpload = async () => {
    if (!uploadForm.file || !uploadForm.name) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      // Upload file to storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-documents')
        .getPublicUrl(fileName);

      // Create document record
      const { error: docError } = await supabase
        .from('client_documents')
        .insert({
          user_id: user.id,
          client_id: clientId,
          name: uploadForm.name,
          file_url: publicUrl,
          file_type: uploadForm.file.type,
          category: 'nursing_form',
        });

      if (docError) throw docError;

      toast({ title: "Form uploaded successfully!" });
      setUploadDialogOpen(false);
      setUploadForm({ name: '', description: '', category: 'assessment', file: null });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error uploading form",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
        template_type: 'nursing',
        category: newTemplate.category,
        fields: newTemplate.fields as any,
      }]);

      if (error) throw error;

      toast({ title: "Template created successfully!" });
      setCreateTemplateOpen(false);
      setNewTemplate({ name: '', description: '', category: 'assessment', fields: [] });
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

  const handleDeleteUploadedForm = async (id: string) => {
    try {
      const { error } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Uploaded form deleted" });
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
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      assessment: 'bg-blue-100 text-blue-800',
      visit: 'bg-green-100 text-green-800',
      supervisory: 'bg-purple-100 text-purple-800',
      discharge: 'bg-orange-100 text-orange-800',
      oasis: 'bg-pink-100 text-pink-800',
    };
    return <Badge className={`${colors[category] || 'bg-gray-100 text-gray-800'} capitalize`}>{category}</Badge>;
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
          <h3 className="text-lg font-semibold">Nursing Forms</h3>
          <p className="text-sm text-muted-foreground">RN assessments, visit notes, and clinical documentation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Form
          </Button>
          <Button variant="outline" onClick={() => setCreateTemplateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
          <Button onClick={() => setNewFormOpen(true)}>
            <Stethoscope className="w-4 h-4 mr-2" />
            New Nursing Form
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Completed Forms ({submissions.length})
          </TabsTrigger>
          <TabsTrigger value="uploaded" className="flex items-center gap-2">
            <FileUp className="w-4 h-4" />
            Uploaded Forms ({uploadedForms.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="mt-4">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Stethoscope className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Nursing Forms Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Create nursing assessments, visit notes, and other clinical documentation.
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
                        <Stethoscope className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{submission.template?.name || 'Unnamed Form'}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>Created {formatDate(submission.created_at)}</span>
                          {submission.template?.category && getCategoryBadge(submission.template.category)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(submission.status)}
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewSubmission(submission)}>
                          <Eye className="w-4 h-4" />
                        </Button>
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
        </TabsContent>

        <TabsContent value="uploaded" className="mt-4">
          {uploadedForms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Uploaded Forms</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Upload fillable PDF forms or scanned nursing documents.
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {uploadedForms.map((form) => (
                <Card key={form.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{form.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>Uploaded {formatDate(form.created_at)}</span>
                          <Badge variant="outline">{form.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedUploadedForm(form);
                          setViewUploadedFormOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          // Use fetch to download to avoid browser blocking
                          fetch(form.file_url)
                            .then(response => response.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = form.name || 'download';
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            })
                            .catch(() => {
                              toast({
                                title: "Download failed",
                                description: "Unable to download the file. Try viewing it instead.",
                                variant: "destructive"
                              });
                            });
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteUploadedForm(form.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Form Dialog */}
      <Dialog open={newFormOpen} onOpenChange={setNewFormOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Nursing Form Template</DialogTitle>
            <DialogDescription>Choose a pre-built template or one of your custom templates</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Pre-built Nursing Forms</h4>
              <div className="grid gap-3">
                {nursingFormTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        {getCategoryBadge(template.category)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {templates.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Custom Templates</h4>
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectTemplate(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>
                          {getCategoryBadge(template.category)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fill Form Dialog */}
      <Dialog open={fillFormOpen} onOpenChange={setFillFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-6">
              {selectedTemplate.fields.map((field) => (
                <FormFieldRenderer
                  key={field.id}
                  field={field}
                  value={formData[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
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
            <Button onClick={() => handleSaveForm('completed')} disabled={saving}>
              {saving ? "Saving..." : "Complete Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Form Dialog */}
      <Dialog open={viewFormOpen} onOpenChange={setViewFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.template?.name}</DialogTitle>
            <DialogDescription>Submitted {selectedSubmission?.created_at && formatDate(selectedSubmission.created_at)}</DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              {Object.entries(selectedSubmission.form_data || {}).map(([key, value]) => (
                <div key={key} className="border-b pb-2">
                  <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="font-medium">{String(value) || '-'}</p>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewFormOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Form Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Nursing Form</DialogTitle>
            <DialogDescription>Upload a fillable PDF or scanned nursing form</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Form Name *</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., OASIS Assessment - January 2024"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="visit">Visit Note</SelectItem>
                  <SelectItem value="supervisory">Supervisory</SelectItem>
                  <SelectItem value="discharge">Discharge</SelectItem>
                  <SelectItem value="oasis">OASIS</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
              />
              <p className="text-xs text-muted-foreground">Supported: PDF, Word, JPEG, PNG</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={uploading || !uploadForm.file || !uploadForm.name}>
              {uploading ? "Uploading..." : "Upload Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Uploaded Form Dialog */}
      <Dialog open={viewUploadedFormOpen} onOpenChange={setViewUploadedFormOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedUploadedForm?.name}</DialogTitle>
            <DialogDescription>
              Uploaded {selectedUploadedForm?.created_at && formatDate(selectedUploadedForm.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUploadedForm?.file_type?.includes('pdf') && (
            <div className="bg-muted/50 border rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">📝 Fillable Form Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Fill out the form fields directly in the viewer below</li>
                <li>When done, click <strong>"Save Filled PDF"</strong> or press <kbd className="px-1.5 py-0.5 bg-background rounded border text-xs">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-background rounded border text-xs">P</kbd> (Windows) / <kbd className="px-1.5 py-0.5 bg-background rounded border text-xs">⌘</kbd>+<kbd className="px-1.5 py-0.5 bg-background rounded border text-xs">P</kbd> (Mac)</li>
                <li>Select "Save as PDF" as your printer to download the completed form</li>
              </ol>
            </div>
          )}
          
          <div className="h-[60vh] w-full">
            {selectedUploadedForm?.file_type?.includes('pdf') ? (
              <iframe
                id="pdf-viewer-frame"
                src={selectedUploadedForm.file_url}
                className="w-full h-full border rounded-lg"
                title={selectedUploadedForm.name}
              />
            ) : selectedUploadedForm?.file_type?.includes('image') ? (
              <div className="flex items-center justify-center h-full">
                <img
                  src={selectedUploadedForm.file_url}
                  alt={selectedUploadedForm.name}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <FileText className="w-16 h-16 text-muted-foreground" />
                <p className="text-muted-foreground">Preview not available for this file type</p>
                <Button
                  onClick={() => {
                    if (selectedUploadedForm) {
                      fetch(selectedUploadedForm.file_url)
                        .then(response => response.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = selectedUploadedForm.name || 'download';
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        });
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setViewUploadedFormOpen(false)}>
              Close
            </Button>
            {selectedUploadedForm?.file_type?.includes('pdf') && (
              <Button
                variant="secondary"
                onClick={() => {
                  // Open PDF in new window for printing (workaround for iframe cross-origin)
                  const printWindow = window.open(selectedUploadedForm.file_url, '_blank');
                  if (printWindow) {
                    printWindow.onload = () => {
                      setTimeout(() => {
                        printWindow.print();
                      }, 500);
                    };
                  } else {
                    toast({
                      title: "Pop-up blocked",
                      description: "Please allow pop-ups or use Ctrl+P while viewing the PDF to save it.",
                      variant: "destructive"
                    });
                  }
                }}
              >
                <PenTool className="w-4 h-4 mr-2" />
                Save Filled PDF
              </Button>
            )}
            <Button
              onClick={() => {
                if (selectedUploadedForm) {
                  window.open(selectedUploadedForm.file_url, '_blank');
                }
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Nursing Form Template</DialogTitle>
            <DialogDescription>Build a custom nursing form template</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Wound Care Assessment"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="visit">Visit Note</SelectItem>
                    <SelectItem value="supervisory">Supervisory</SelectItem>
                    <SelectItem value="discharge">Discharge</SelectItem>
                    <SelectItem value="oasis">OASIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this template..."
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
            <Button onClick={handleCreateTemplate} disabled={saving || !newTemplate.name || newTemplate.fields.length === 0}>
              {saving ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
