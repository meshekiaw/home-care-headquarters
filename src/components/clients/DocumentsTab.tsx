import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Plus, 
  FileText, 
  Download, 
  Trash2, 
  Calendar,
  File,
  FileImage,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  PenLine
} from "lucide-react";
import { SignatureRequestDialog } from "@/components/clients/SignatureRequestDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  uploaded_at: string;
  expires_at: string | null;
}

interface DocumentsTabProps {
  clientId: string;
}

export function DocumentsTab({ clientId }: DocumentsTabProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    file_url: "",
    file_type: "",
    category: "general",
    expires_at: "",
  });

  // Signature request state
  const [signatureRequestOpen, setSignatureRequestOpen] = useState(false);
  const [signatureRequestDocName, setSignatureRequestDocName] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  async function fetchDocuments() {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const { error } = await supabase.from('client_documents').insert([{
        client_id: clientId,
        user_id: user.id,
        name: formData.name,
        file_url: formData.file_url,
        file_type: formData.file_type || null,
        category: formData.category,
        expires_at: formData.expires_at || null,
      }]);

      if (error) throw error;

      toast({ title: "Document added successfully!" });
      setDialogOpen(false);
      setFormData({
        name: "",
        file_url: "",
        file_type: "",
        category: "general",
        expires_at: "",
      });
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Error adding document",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Document deleted successfully!" });
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5" />;
    if (fileType.includes('image')) return <FileImage className="w-5 h-5" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) 
      return <FileSpreadsheet className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'medical': return 'bg-destructive/10 text-destructive';
      case 'legal': return 'bg-warning/10 text-warning';
      case 'insurance': return 'bg-primary/10 text-primary';
      case 'identification': return 'bg-success/10 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
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

  // Group documents by category
  const groupedDocuments = documents.reduce((acc, doc) => {
    const category = doc.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Documents</h3>
          <p className="text-sm text-muted-foreground">Manage client documents and files</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Document</DialogTitle>
              <DialogDescription>Add a document reference for this client</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Document Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Insurance Card"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file_url">File URL *</Label>
                <Input
                  id="file_url"
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, file_url: e.target.value }))}
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="identification">Identification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file_type">File Type</Label>
                  <Input
                    id="file_type"
                    value={formData.file_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, file_type: e.target.value }))}
                    placeholder="e.g., PDF, Image"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiration Date (optional)</Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Add Document
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Documents</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Add documents like medical records, insurance cards, or legal documents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([category, docs]) => (
            <div key={category} className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getCategoryColor(category).split(' ')[0]}`}></span>
                {category} ({docs.length})
              </h4>
              <div className="grid gap-3">
                {docs.map((doc) => (
                  <Card key={doc.id} className={isExpired(doc.expires_at) ? 'border-destructive/50' : ''}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(doc.category)}`}>
                          {getFileIcon(doc.file_type)}
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(doc.uploaded_at)}
                            </span>
                            {doc.file_size && (
                              <span>{formatFileSize(doc.file_size)}</span>
                            )}
                          </div>
                          {doc.expires_at && (
                            <div className="flex items-center gap-1 mt-1">
                              {isExpired(doc.expires_at) ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Expired {formatDate(doc.expires_at)}
                                </Badge>
                              ) : isExpiringSoon(doc.expires_at) ? (
                                <Badge variant="outline" className="text-xs text-warning border-warning">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Expires {formatDate(doc.expires_at)}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Expires: {formatDate(doc.expires_at)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          asChild
                        >
                          <a 
                            href="#" 
                            onClick={async (e) => {
                              e.preventDefault();
                              const path = doc.file_url.includes('/storage/') 
                                ? doc.file_url.split('/client-documents/')[1] || doc.file_url 
                                : doc.file_url;
                              const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 3600);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSignatureRequestDocName(doc.name);
                            setSignatureRequestOpen(true);
                          }}
                          title="Request signature via email"
                        >
                          <PenLine className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signature Request Dialog */}
      <SignatureRequestDialog
        open={signatureRequestOpen}
        onOpenChange={setSignatureRequestOpen}
        documentName={signatureRequestDocName}
      />
    </div>
  );
}
