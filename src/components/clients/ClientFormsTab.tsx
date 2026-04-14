import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ClientFormsTabProps {
  clientId: string;
}

const FORM_CATEGORIES = [
  { key: "care_plan", label: "Care Plan", description: "Client care plan documents" },
  { key: "authorization", label: "Authorizations", description: "Service authorization forms" },
  { key: "admit_chart", label: "Admit Chart", description: "Admission chart documents" },
  { key: "618", label: "618", description: "618 Nurse Assessment forms" },
  { key: "emergency_care_form", label: "Emergency Care Forms", description: "Emergency care documentation" },
] as const;

type CategoryKey = typeof FORM_CATEGORIES[number]["key"];

interface DocRecord {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  uploaded_at: string;
}

export function ClientFormsTab({ clientId }: ClientFormsTabProps) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchDocs();
  }, [clientId]);

  async function fetchDocs() {
    try {
      const { data, error } = await supabase
        .from("client_documents")
        .select("id, name, file_url, file_type, file_size, category, uploaded_at")
        .eq("client_id", clientId)
        .in("category", FORM_CATEGORIES.map((c) => c.key));
      if (error) throw error;
      setDocs(data || []);
    } catch (e: any) {
      toast({ title: "Error loading forms", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(category: CategoryKey, file: File) {
    setUploading(category);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${clientId}/${category}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file);
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from("client-documents")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("client_documents").insert({
        client_id: clientId,
        user_id: user.id,
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        category,
      });
      if (dbError) throw dbError;

      toast({ title: "File uploaded successfully" });
      fetchDocs();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(doc: DocRecord) {
    try {
      const { error } = await supabase.from("client_documents").delete().eq("id", doc.id);
      if (error) throw error;
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast({ title: "File deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  }

  const docsByCategory = (key: string) => docs.filter((d) => d.category === key);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {FORM_CATEGORIES.map((cat) => {
        const catDocs = docsByCategory(cat.key);
        const isUploading = uploading === cat.key;

        return (
          <Card key={cat.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{cat.label}</CardTitle>
                {catDocs.length > 0 ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {catDocs.length}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <AlertCircle className="w-3 h-3" /> Missing
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{cat.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {catDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                ref={(el) => { fileInputRefs.current[cat.key] = el; }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(cat.key, file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isUploading}
                onClick={() => fileInputRefs.current[cat.key]?.click()}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
