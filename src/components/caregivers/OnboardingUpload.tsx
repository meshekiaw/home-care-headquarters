import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { caregiverDocumentRequest, type OnboardingDocument } from "@/hooks/useCaregiverOnboarding";
import { DOCUMENT_ACCEPT, documentValidation, MAX_STEP_FILES } from "@/utils/caregiverOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import { Camera, Upload, FileText, Trash2, Download, Loader2, Save } from "lucide-react";

export default function OnboardingUpload({ caregiverId, stepKey, locked, certificateName, noCertificate, documents, onSaved }: {
  caregiverId:string; stepKey:string; locked:boolean; certificateName:string | null;
  noCertificate:boolean; documents:OnboardingDocument[]; onSaved:() => Promise<void>;
}) {
  const { toast } = useToast();
  const fileInput=useRef<HTMLInputElement>(null);
  const cameraInput=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false);
  const [name,setName]=useState(certificateName ?? "");
  const [none,setNone]=useState(noCertificate);
  const [remove,setRemove]=useState<OnboardingDocument | null>(null);
  const isCertificate=stepKey === "certificate";
  const fileError=(message:string) => toast({ title:"Could not complete file request",description:message,variant:"destructive" });

  const saveCertificate = async (nextNone:boolean) => {
    if (!nextNone && (!name.trim() || name.trim().length>150)) {
      toast({ title:"Enter the certificate name",variant:"destructive" }); return;
    }
    setBusy(true);
    try {
      const { error }=await supabase.rpc("save_onboarding_certificate",{ p_name:name.trim(),p_no_certificate:nextNone });
      if (error) throw error;
      setNone(nextNone);
      await onSaved();
      toast({ title:nextNone ? "Certificate marked not applicable" : "Certificate name saved" });
    } catch(error) { fileError(friendlyError(error)); }
    finally { setBusy(false); }
  };

  const upload = async (files:FileList | null) => {
    if (!files?.length) return;
    const selected=Array.from(files);
    let count=documents.length;
    for (const file of selected) {
      const error=documentValidation(file,count++);
      if (error) { fileError(error); return; }
    }
    if (isCertificate && !name.trim()) { fileError("Enter the certificate name first."); return; }
    setBusy(true);
    let uploaded=0;
    try {
      if (isCertificate) {
        const { error }=await supabase.rpc("save_onboarding_certificate",{p_name:name.trim(),p_no_certificate:false});
        if (error) throw error;
      }
      for(const file of selected) {
        const form=new FormData();
        form.append("caregiver_id",caregiverId); form.append("step_key",stepKey); form.append("file",file);
        await caregiverDocumentRequest(form);
        uploaded++;
      }
      toast({title:uploaded === 1 ? "File submitted for review" : "Files submitted for review"});
    } catch(error) { fileError(error instanceof Error ? error.message : "The upload failed. Please try again."); }
    finally {
      await onSaved(); setBusy(false);
      if(fileInput.current) fileInput.current.value="";
      if(cameraInput.current) cameraInput.current.value="";
    }
  };

  const openFile=async (document:OnboardingDocument) => {
    setBusy(true);
    try {
      const ticket=await caregiverDocumentRequest<{ticket:string}>({action:"request_access",document_id:document.id});
      const blob=await caregiverDocumentRequest<Blob>({action:"open",ticket:ticket.ticket});
      if (!(blob instanceof Blob)) throw new Error("The file could not be downloaded. Please try again.");
      const url=URL.createObjectURL(blob);
      const link=document.createElement ? null : null;
      const anchor=window.document.createElement("a");
      anchor.href=url;anchor.download=document.file_name;window.document.body.appendChild(anchor);anchor.click();anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch(error) { fileError(error instanceof Error ? error.message : "The file could not be opened."); }
    finally {setBusy(false);}
  };

  const archive=async () => {
    if(!remove) return;
    setBusy(true);
    try {
      await caregiverDocumentRequest({action:"archive",document_id:remove.id});
      await onSaved();toast({title:"File removed"});
    } catch(error) {fileError(error instanceof Error ? error.message : "The file could not be removed.");}
    finally {setBusy(false);setRemove(null);}
  };

  return <div className="space-y-4">
    {isCertificate && <>
      <div><Label htmlFor="certificate-name">Certificate name</Label>
        <Input id="certificate-name" maxLength={150} value={name} onChange={(e)=>setName(e.target.value)} disabled={locked || busy || none} className="mt-1" />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="no-certificate" checked={none} disabled={locked || busy} onCheckedChange={(checked) => {
          if(checked === true) void saveCertificate(true);
          else setNone(false);
        }} />
        <Label htmlFor="no-certificate" className="leading-5">I don’t have a certificate</Label>
      </div>
      {!locked && !none && <Button variant="outline" disabled={busy || !name.trim()} onClick={() => void saveCertificate(false)} className="gap-2"><Save className="h-4 w-4" />Save certificate name</Button>}
    </>}
    {documents.length>0 && <ul className="space-y-2">
      {documents.map((doc)=><li key={doc.id} className="flex items-center gap-2 border-b py-2">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 min-w-0 break-all text-sm">{doc.file_name}</span>
        <Button size="icon" variant="ghost" disabled={busy} aria-label={`Download ${doc.file_name}`} title={`Download ${doc.file_name}`} onClick={()=>void openFile(doc)}><Download className="h-4 w-4" /></Button>
        {!locked && <Button size="icon" variant="ghost" disabled={busy} aria-label={`Remove ${doc.file_name}`} title={`Remove ${doc.file_name}`} onClick={()=>setRemove(doc)}><Trash2 className="h-4 w-4" /></Button>}
      </li>)}
    </ul>}
    {!locked && !none && <div className="border border-dashed rounded-lg p-4 space-y-3 bg-muted/20">
      <p className="text-sm text-muted-foreground">PDF, JPG, PNG or HEIC · 10 MB each · {documents.length} of 2 files</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || documents.length>=MAX_STEP_FILES} onClick={()=>fileInput.current?.click()} className="gap-2">{busy?<Loader2 className="h-4 w-4 animate-spin" />:<Upload className="h-4 w-4" />}Choose files</Button>
        <Button variant="outline" disabled={busy || documents.length>=MAX_STEP_FILES} onClick={()=>cameraInput.current?.click()} className="gap-2"><Camera className="h-4 w-4" />Take photo</Button>
      </div>
      <input ref={fileInput} type="file" accept={DOCUMENT_ACCEPT} multiple className="hidden" aria-label={`Upload ${stepKey}`} onChange={(e)=>void upload(e.target.files)} />
      <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/heic" capture="environment" className="hidden" aria-label={`Take photo for ${stepKey}`} onChange={(e)=>void upload(e.target.files)} />
      {busy && <p className="text-sm text-muted-foreground" role="status">Saving…</p>}
    </div>}
    <AlertDialog open={Boolean(remove)} onOpenChange={(open)=>{if(!open && !busy)setRemove(null);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this file?</AlertDialogTitle><AlertDialogDescription>{remove?.file_name}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(e)=>{e.preventDefault();void archive();}}>{busy?"Removing…":"Remove file"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}