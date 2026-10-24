import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import type { AdminOnboardingStep } from "@/hooks/useAdminCaregiverOnboarding";
import type { OnboardingDocument } from "@/hooks/useCaregiverOnboarding";
import { reviewSchema, certificateSchema } from "@/utils/adminOnboarding";

export type ReviewAction = "approve" | "send_back" | "paper_approve";
export default function OnboardingReviewDialog({ step, action, documents, onClose, onSaved }: {
  step: AdminOnboardingStep; action: ReviewAction; documents: OnboardingDocument[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(action === "send_back" ? step.sent_back_reason ?? "" : step.admin_note ?? "");
  const [originalSeen, setOriginalSeen] = useState(Boolean(step.original_seen_date));
  const [originalDate, setOriginalDate] = useState(step.original_seen_date ?? "");
  const [addCredential, setAddCredential] = useState(false);
  const [certificate, setCertificate] = useState({ name: step.certificate_name ?? "", number: "", issue_date: "", expiry_date: "", document_id: documents[0]?.id ?? "" });
  const { toast } = useToast();
  const title = action === "send_back" ? "Send step back" : action === "paper_approve" ? "Mark approved without upload" : "Approve step";
  async function save() {
    const parsed = reviewSchema.safeParse({ action, note, originalSeen, originalDate });
    if (!parsed.success) { toast({ title: "Check the review details", description: parsed.error.issues[0]?.message, variant: "destructive" }); return; }
    const linked = addCredential ? certificateSchema.safeParse(certificate) : null;
    if (linked && !linked.success) { toast({ title: "Check the certificate details", description: linked.error.issues[0]?.message, variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("review_caregiver_onboarding", {
        p_step_id: step.id, p_action: action, p_note: parsed.data.note,
        p_original_seen_date: originalSeen ? originalDate : undefined,
        p_credential: linked?.success ? linked.data : undefined,
      });
      if (error) throw error;
      await onSaved(); toast({ title: action === "send_back" ? "Step sent back" : "Step approved" }); onClose();
    } catch (e) { toast({ title: "Could not save review", description: friendlyError(e), variant: "destructive" }); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onInteractOutside={e => { if (busy) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{step.step_number}. {step.step_label}</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="review-note">{action === "send_back" ? "Reason shown to caregiver" : action === "paper_approve" ? "What paperwork was received?" : "Office note (optional)"}</Label><Textarea id="review-note" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} disabled={busy} /></div>
        {["photo_id", "social_security_card"].includes(step.step_key) && <div className="space-y-3">
          <div className="flex items-start gap-2"><Checkbox id="original-seen" checked={originalSeen} disabled={busy} onCheckedChange={v => setOriginalSeen(v === true)} /><Label htmlFor="original-seen">Original seen in person</Label></div>
          {originalSeen && <div className="space-y-2"><Label htmlFor="original-seen-date">Date original seen</Label><Input id="original-seen-date" type="date" value={originalDate} disabled={busy} onChange={e => setOriginalDate(e.target.value)} /></div>}
        </div>}
        {step.step_key === "certificate" && action === "approve" && documents.length > 0 && <>
          <div className="flex items-start gap-2"><Checkbox id="add-credential" checked={addCredential} disabled={busy} onCheckedChange={v => setAddCredential(v === true)} /><Label htmlFor="add-credential">Add to Credentials</Label></div>
          {addCredential && <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="credential-name">Certificate name</Label><Input id="credential-name" value={certificate.name} maxLength={150} disabled={busy} onChange={e => setCertificate(v => ({ ...v, name: e.target.value }))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="credential-number">Certificate number</Label><Input id="credential-number" value={certificate.number} maxLength={150} disabled={busy} onChange={e => setCertificate(v => ({ ...v, number: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="credential-issue">Issue date</Label><Input id="credential-issue" type="date" value={certificate.issue_date} disabled={busy} onChange={e => setCertificate(v => ({ ...v, issue_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="credential-expiry">Expiration date</Label><Input id="credential-expiry" type="date" value={certificate.expiry_date} disabled={busy} onChange={e => setCertificate(v => ({ ...v, expiry_date: e.target.value }))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="credential-document">Certificate file</Label><Select value={certificate.document_id} disabled={busy} onValueChange={v => setCertificate(c => ({ ...c, document_id: v }))}><SelectTrigger id="credential-document" className="min-w-0"><SelectValue /></SelectTrigger><SelectContent>{documents.map(d => <SelectItem key={d.id} value={d.id}><span className="break-all">{d.file_name}</span></SelectItem>)}</SelectContent></Select></div>
          </div>}
        </>}
      </div>
      <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{busy ? "Saving…" : action === "send_back" ? "Send back" : "Approve"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}