import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Loader2, Check, Undo2, FileCheck2, Eye, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useAdminCaregiverOnboarding, type AdminOnboardingStep } from "@/hooks/useAdminCaregiverOnboarding";
import type { OnboardingDocument } from "@/hooks/useCaregiverOnboarding";
import { friendlyError } from "@/lib/friendlyError";
import { onboardingStatus } from "@/utils/adminOnboarding";
import { onboardingRosterSummary, ONBOARDING_ROSTER_LABEL } from "@/utils/caregiverOnboarding";
import { formatDateOnly } from "@/utils/dateOnly";
import OfficeOnboardingStep from "./OfficeOnboardingStep";
import OnboardingReviewDialog, { type ReviewAction } from "./OnboardingReviewDialog";
import CaregiverDocumentViewer from "./CaregiverDocumentViewer";

const stamp = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
function Status({ status }: { status: string }) {
  const style = status in onboardingStatus ? onboardingStatus[status as keyof typeof onboardingStatus] : onboardingStatus.not_started;
  return <Badge variant={style.variant}>{style.label}</Badge>;
}
export default function AdminOnboardingTab({ caregiver, onSaved }: { caregiver: Tables<"caregivers">; onSaved: () => Promise<void> }) {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const onboarding = useAdminCaregiverOnboarding(caregiver.id, isAdmin && !roleLoading);
  const [view, setView] = useState<OnboardingDocument | null>(null);
  const [review, setReview] = useState<{ step: AdminOnboardingStep; action: ReviewAction } | null>(null);
  const [required, setRequired] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const refresh = async () => { await Promise.all([onboarding.refresh(), onSaved()]); };
  async function saveRequirement() {
    if (required === null) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("set_caregiver_onboarding_required", { p_caregiver_id: caregiver.id, p_required: required });
      if (error) throw error;
      await refresh(); toast({ title: required ? "Onboarding required" : "Onboarding not required" }); setRequired(null);
    } catch (e) { toast({ title: "Could not change onboarding requirement", description: friendlyError(e), variant: "destructive" }); }
    finally { setBusy(false); }
  }
  if (roleLoading || onboarding.isLoading) return <div className="flex items-center gap-2 py-8 text-muted-foreground" role="status"><Loader2 className="h-5 w-5 animate-spin" />Loading onboarding…</div>;
  if (!isAdmin) return null;
  if (onboarding.isError) return <div className="space-y-3"><p role="alert" className="text-destructive">{friendlyError(onboarding.error, "Onboarding could not be loaded. Try again.")}</p><Button variant="outline" onClick={() => void onboarding.refetch()}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button></div>;
  const data = onboarding.data;
  if (!data) return <p className="text-muted-foreground">No active onboarding record.</p>;
  const summary = onboardingRosterSummary(caregiver.onboarding_required, data.steps);
  const documentsFor = (stepId: string) => data.documents.filter(d => d.step_id === stepId);
  return <div className="space-y-8 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
      <div><h2 className="text-lg font-semibold">Onboarding</h2><p className="text-sm text-muted-foreground">{ONBOARDING_ROSTER_LABEL[summary.status]} · {summary.done} of 12{summary.completedAt ? ` · ${stamp(summary.completedAt)}` : ""}</p></div>
      <div className="flex items-center gap-3"><Label htmlFor="onboarding-required">Onboarding required</Label><Switch id="onboarding-required" checked={caregiver.onboarding_required} disabled={busy} onCheckedChange={setRequired} /><span className="text-sm">{caregiver.onboarding_required ? "Yes" : "No"}</span></div>
    </div>
    {[{ label: "Caregiver steps", from: 1, to: 6 }, { label: "Office steps", from: 7, to: 11 }, { label: "Orientation", from: 12, to: 12 }].map(group => <section key={group.label} className="space-y-4">
      <h3 className="font-semibold text-base">{group.label}</h3>
      <div className="grid gap-4 lg:grid-cols-2">{data.steps.filter(s => s.step_number >= group.from && s.step_number <= group.to).map(step => {
        const docs = documentsFor(step.id);
        return <article key={step.id} className="rounded-lg border bg-card text-card-foreground p-4 min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-medium">{step.step_number}. {step.step_label}</h4><Status status={step.status} /></div>
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Submitted</dt><dd>{stamp(step.submitted_at)}</dd></div><div><dt className="text-muted-foreground">Approved</dt><dd>{stamp(step.approved_at)}</dd></div><div className="sm:col-span-2"><dt className="text-muted-foreground">Approved by</dt><dd className="break-words">{step.approved_by_name ?? "—"}</dd></div></dl>
          {step.sent_back_reason && <p className="text-sm text-onboarding-returned whitespace-pre-wrap break-words">{step.sent_back_reason}</p>}
          {step.original_seen_date && <p className="text-sm">Original seen in person: {formatDateOnly(step.original_seen_date)}</p>}
          {step.step_key === "certificate" && <p className="text-sm">{step.no_certificate ? "No certificate" : step.certificate_name ?? "Certificate name not entered"}</p>}
          {step.step_number <= 6 && <>
            {docs.length > 0 ? <ul className="divide-y">{docs.map(doc => <li key={doc.id} className="flex items-center gap-2 py-2 min-w-0"><FileText className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm break-all flex-1 min-w-0">{doc.file_name}</span><Button size="sm" variant="ghost" aria-label={`View ${doc.file_name}`} onClick={() => setView(doc)}><Eye className="h-4 w-4 mr-2" />View</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">No files uploaded</p>}
            {step.admin_note && <p className="text-sm whitespace-pre-wrap break-words">Office note: {step.admin_note}</p>}
            <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setReview({ step, action: "approve" })}><Check className="h-4 w-4 mr-2" />Approve</Button><Button size="sm" variant="outline" onClick={() => setReview({ step, action: "send_back" })}><Undo2 className="h-4 w-4 mr-2" />Send back</Button><Button size="sm" variant="ghost" className="h-auto py-2 whitespace-normal text-left" onClick={() => setReview({ step, action: "paper_approve" })}><FileCheck2 className="h-4 w-4 mr-2 shrink-0" />Mark approved without upload</Button></div>
          </>}
          {step.step_number >= 7 && step.step_number <= 11 && <OfficeOnboardingStep caregiver={caregiver} step={step} documents={docs} onView={setView} onSaved={refresh} />}
        </article>;
      })}</div>
    </section>)}
    <section className="space-y-4 border-t pt-6"><h3 className="font-semibold">History</h3><ol className="divide-y">{data.history.map(h => {
      const step = data.steps.find(s => s.id === h.step_id);
      return <li key={h.id} className="py-3 space-y-1 text-sm"><div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><span className="font-medium">{step ? `${step.step_number}. ${step.step_label}` : "Onboarding required"}</span><time className="text-muted-foreground">{stamp(h.changed_at)}</time></div><p className="break-words">{h.actor_name}{h.new_status ? ` · ${h.old_status ? `${onboardingStatus[h.old_status as keyof typeof onboardingStatus]?.label ?? h.old_status} → ` : ""}${onboardingStatus[h.new_status as keyof typeof onboardingStatus]?.label ?? h.new_status}` : ` · ${h.event_type.replace(/_/g, " ")}`}</p>{h.note && <p className="text-muted-foreground whitespace-pre-wrap break-words">{h.note}</p>}</li>;
    })}</ol></section>
    <CaregiverDocumentViewer document={view} onClose={() => setView(null)} />
    {review && <OnboardingReviewDialog key={`${review.step.id}-${review.action}`} step={review.step} action={review.action} documents={documentsFor(review.step.id)} onClose={() => setReview(null)} onSaved={refresh} />}
    <AlertDialog open={required !== null} onOpenChange={open => { if (!open && !busy) setRequired(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{required ? "Require onboarding?" : "Turn off onboarding requirement?"}</AlertDialogTitle><AlertDialogDescription>{caregiver.first_name} {caregiver.last_name} · Onboarding required: {required ? "Yes" : "No"}. Existing steps and history are retained. Scheduling clearance is unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void saveRequirement(); }}>{busy ? "Saving…" : "Confirm"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}