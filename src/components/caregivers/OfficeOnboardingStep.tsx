import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, Eye, Replace, Save, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { caregiverDocumentRequest, type OnboardingDocument } from "@/hooks/useCaregiverOnboarding";
import type { AdminOnboardingStep } from "@/hooks/useAdminCaregiverOnboarding";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import { DOCUMENT_ACCEPT, documentValidation } from "@/utils/caregiverOnboarding";
import { officeSavePayload, replacementNoteSchema } from "@/utils/adminOnboarding";
import { formatDateOnly } from "@/utils/dateOnly";

function datesFor(step: string, caregiver: Tables<"caregivers">) {
  if (step === "background_check") return { date: caregiver.background_check_date, expiration: caregiver.background_check_expiration_date, label: "Background check date" };
  if (step === "adult_maltreatment_check") return { date: caregiver.adult_maltreatment_check_date, expiration: caregiver.adult_maltreatment_expiration_date, label: "Adult maltreatment check date" };
  if (step === "child_maltreatment_check") return { date: caregiver.child_maltreatment_check_date, expiration: caregiver.child_maltreatment_expiration_date, label: "Child maltreatment check date" };
  return { date: caregiver.tmu_date, expiration: caregiver.tmu_expiration_date, label: "TMU Date" };
}
export default function OfficeOnboardingStep({ caregiver, step, documents, onView, onSaved }: {
  caregiver: Tables<"caregivers">; step: AdminOnboardingStep; documents: OnboardingDocument[]; onView: (document: OnboardingDocument) => void; onSaved: () => Promise<void>;
}) {
  const current = datesFor(step.step_key, caregiver);
  const [date, setDate] = useState(current.date ?? "");
  const [expiration, setExpiration] = useState(current.expiration ?? "");
  const [note, setNote] = useState(step.admin_note ?? "");
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState<OnboardingDocument | null>(null);
  const [replacementNote, setReplacementNote] = useState("");
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const payroll = step.step_key === "tax_payroll_forms";
  const tmu = step.step_key === "tmu";
  async function upload(files: File[]) {
    for (const file of files) { const error = documentValidation(file, 0); if (error) { toast({ title: "Check the file", description: error, variant: "destructive" }); return; } }
    const parsedNote = replacementNoteSchema.safeParse(replacementNote);
    if (replace && !parsedNote.success) { toast({ title: "Enter a replacement note", variant: "destructive" }); return; }
    setBusy(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        const form = new FormData(); form.append("caregiver_id", caregiver.id); form.append("step_key", step.step_key); form.append("file", file);
        if (replace && parsedNote.success) { form.append("replace_document_id", replace.id); form.append("replacement_note", parsedNote.data); }
        await caregiverDocumentRequest(form); uploaded++;
      }
      toast({ title: replace ? "File replaced" : uploaded === 1 ? "File uploaded" : "Files uploaded" });
      setReplace(null); setReplacementFile(null); setReplacementNote("");
    } catch (e) { toast({ title: "Could not upload file", description: friendlyError(e), variant: "destructive" }); }
    finally { await onSaved(); setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function save() {
    setBusy(true);
    try {
      const payload = officeSavePayload(step.step_key, date, expiration);
      const { error } = await supabase.rpc("save_office_onboarding", { p_step_id: step.id, ...payload, p_note: note.trim() });
      if (error) throw error;
      await onSaved(); toast({ title: "Office step saved and approved" });
    } catch (e) { toast({ title: "Could not save office step", description: friendlyError(e), variant: "destructive" }); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {documents.length > 0 && <ul className="divide-y">{documents.map(d => <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="flex-1 min-w-0 break-all text-sm">{d.file_name}</span>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => onView(d)} aria-label={`View ${d.file_name}`}><Eye className="h-4 w-4 mr-2" />View</Button>
      <Button size="icon" variant="ghost" title={`Replace ${d.file_name}`} aria-label={`Replace ${d.file_name}`} disabled={busy} onClick={() => { setReplace(d); setReplacementNote(""); setReplacementFile(null); }}><Replace className="h-4 w-4" /></Button>
    </li>)}</ul>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}><Upload className="h-4 w-4 mr-2" />Upload {payroll ? "files" : "result"}</Button></div>
    <input ref={input} className="hidden" type="file" accept={DOCUMENT_ACCEPT} multiple={payroll} aria-label={`Upload ${step.step_label}`} onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) void upload(files); }} />
    <div className="grid gap-4 sm:grid-cols-2">
      {!payroll && <div className="space-y-2"><Label htmlFor={`check-${step.id}`}>{current.label}</Label><Input id={`check-${step.id}`} type="date" value={date} onChange={e => setDate(e.target.value)} disabled={busy} /></div>}
      {!payroll && (tmu ? <div className="space-y-2"><Label htmlFor={`expiry-${step.id}`}>TMU Expiration Date</Label><Input id={`expiry-${step.id}`} type="date" value={expiration} onChange={e => setExpiration(e.target.value)} disabled={busy} /></div> : <div className="space-y-2"><Label>Expiration</Label><p className="min-h-10 flex items-center text-sm text-muted-foreground">{formatDateOnly(current.expiration) ?? "—"}</p></div>)}
      <div className="space-y-2 sm:col-span-2"><Label htmlFor={`note-${step.id}`}>Office note (optional)</Label><Textarea id={`note-${step.id}`} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} /></div>
    </div>
    <Button disabled={busy || !documents.length} onClick={() => void save()}><Save className="h-4 w-4 mr-2" />Save and approve</Button>
    {busy && <p className="text-sm text-muted-foreground flex items-center gap-2" role="status"><Loader2 className="h-4 w-4 animate-spin" />Saving…</p>}
    <Dialog open={Boolean(replace)} onOpenChange={open => { if (!open && !busy) setReplace(null); }}>
      <DialogContent><DialogHeader><DialogTitle>Replace file</DialogTitle><DialogDescription className="break-all">{replace?.file_name}</DialogDescription></DialogHeader>
        <div className="space-y-4"><div className="space-y-2"><Label htmlFor="replacement-file">New file</Label><Input id="replacement-file" type="file" accept={DOCUMENT_ACCEPT} disabled={busy} onChange={e => setReplacementFile(e.target.files?.[0] ?? null)} /></div><div className="space-y-2"><Label htmlFor="replacement-note">Replacement note</Label><Textarea id="replacement-note" maxLength={2000} value={replacementNote} disabled={busy} onChange={e => setReplacementNote(e.target.value)} /></div></div>
        <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setReplace(null)}>Cancel</Button><Button disabled={busy || !replacementFile || !replacementNote.trim()} onClick={() => { if (replacementFile) void upload([replacementFile]); }}>{busy ? "Replacing…" : "Replace file"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}