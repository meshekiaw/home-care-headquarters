import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { caregiverDocumentRequest } from "@/hooks/useCaregiverOnboarding";
import { PdfCanvasViewer } from "@/components/clients/PdfCanvasViewer";
import { useToast } from "@/hooks/use-toast";

export type ViewableCaregiverDocument = { id: string; file_name: string; mime_type: string };
export default function CaregiverDocumentViewer({ document, onClose }: { document: ViewableCaregiverDocument | null; onClose: () => void }) {
  const [preview, setPreview] = useState<{ url: string; pdf: boolean } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const { toast } = useToast();
  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    setPreview(null); setError(""); setLoading(true);
    void (async () => {
      try {
        const access = await caregiverDocumentRequest<{ ticket: string }>({ action: "request_access", document_id: document.id });
        const file = await caregiverDocumentRequest<Blob>({ action: "open", ticket: access.ticket });
        if (!(file instanceof Blob)) throw new Error("The file could not be opened. Try again.");
        const ext = document.file_name.split(".").pop()?.toLowerCase();
        const pdf = ext === "pdf";
        let blob = new Blob([file], { type: pdf ? "application/pdf" : ext === "png" ? "image/png" : ext === "heic" ? "image/heic" : "image/jpeg" });
        if (ext === "heic") {
          const { default: convert } = await import("heic2any");
          const converted = await convert({ blob, toType: "image/jpeg", quality: 0.9 });
          const first = Array.isArray(converted) ? converted[0] : converted;
          if (!first) throw new Error("This photo could not be displayed.");
          blob = first;
        }
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ url: objectUrl, pdf });
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "The file could not be opened. Try again.";
          setError(message); toast({ title: "Could not open document", description: message, variant: "destructive" });
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [document, retry, toast]);
  return <Dialog open={Boolean(document)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-5xl h-[88dvh] flex flex-col min-w-0">
      <DialogHeader className="pr-6"><DialogTitle className="break-all">{document?.file_name}</DialogTitle><DialogDescription>Caregiver document</DialogDescription></DialogHeader>
      {loading && <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground" role="status"><Loader2 className="h-5 w-5 animate-spin" />Opening document…</div>}
      {error && <div className="space-y-3"><p role="alert" className="text-destructive">{error}</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button></div>}
      {preview && (preview.pdf ? <PdfCanvasViewer fileUrl={preview.url} className="min-h-0 flex-1" /> : <div className="min-h-0 flex-1 overflow-auto"><img src={preview.url} alt={document?.file_name ?? "Caregiver document"} className="max-w-full max-h-full object-contain mx-auto" /></div>)}
    </DialogContent>
  </Dialog>;
}