import { useEffect, useState } from "react";
import { Edit, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ClientAuthorizationFields } from "./ClientAuthorizationFields";
import { ClientAuthorizationSummary } from "./ClientAuthorizationSummary";
import { authorizationDate, authorizationDraft, authorizationPayload, type AuthorizationProgress } from "@/utils/clientAuthorization";

const milestones = [
  ["assessment_scheduled_at", "Assessment scheduled"], ["assessment_completed_on", "Assessment completed"],
  ["submitted_on", "Authorization submitted"], ["approved_on", "Authorization approved"], ["denied_on", "Authorization denied"],
] as const;

export function ClientAuthorizationPanel({ clientId }: { clientId: string }) {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [progress, setProgress] = useState<AuthorizationProgress | null>(null);
  const [history, setHistory] = useState<Tables<"client_authorization_history">[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [draft, setDraft] = useState(() => authorizationDraft());
  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    let active = true; setLoading(true); setFailed(false);
    void Promise.all([
      supabase.from("client_authorization_progress").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("client_authorization_history").select("*").eq("client_id", clientId).order("changed_at", { ascending: false }).order("id"),
    ]).then(([p, h]) => {
      if (!active) return;
      if (p.error || h.error) { setFailed(true); toast({ title: "Unable to load authorization progress", description: friendlyError(p.error || h.error), variant: "destructive" }); }
      else { setProgress(p.data); setHistory(h.data ?? []); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [clientId, isAdmin, refresh, toast]);
  const save = async (clear = false) => {
    if (!isAdmin || saving) return;
    setSaving(true);
    try {
      const payload = authorizationPayload(clear ? authorizationDraft() : draft);
      let query = supabase.from("client_authorization_progress").update(payload).eq("client_id", clientId);
      if (progress?.updated_at) query = query.eq("updated_at", progress.updated_at);
      const { error, data } = await query.select("client_id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Authorization progress changed or is unavailable. Refresh and try again.");
      toast({ title: clear ? "Authorization entries cleared; history retained" : "Authorization progress saved" });
      setEditing(false); setClearing(false); setRefresh(n => n + 1);
    } catch (error) { toast({ title: "Unable to save authorization progress", description: friendlyError(error), variant: "destructive" }); }
    finally { setSaving(false); }
  };
  if (!isAdmin) return null;
  return <section aria-label="Authorization progress" className="space-y-5 border-b pb-6 mb-6">
    <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-lg font-semibold">Authorization progress</h2><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={loading || failed || !progress} onClick={() => { setDraft(authorizationDraft(progress)); setEditing(true); }}><Edit className="w-4 h-4 mr-2" />Edit authorization</Button>{(progress?.submitted_on || progress?.approved_on || progress?.denied_on) && <Button type="button" variant="ghost" size="icon" aria-label="Clear authorization entries" title="Clear authorization entries" onClick={() => setClearing(true)}><Trash2 className="w-4 h-4" /></Button>}</div></div>
    {loading ? <Loader2 aria-label="Loading authorization progress" className="w-5 h-5 animate-spin text-muted-foreground" /> : failed ? <Button type="button" variant="outline" onClick={() => setRefresh(n => n + 1)}>Retry authorization progress</Button> : <>
      <ClientAuthorizationSummary progress={progress} />
      <dl className="grid gap-4 sm:grid-cols-2">{milestones.map(([key, label]) => <div key={key}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-medium">{authorizationDate(progress?.[key])}</dd></div>)}</dl>
      {progress?.denial_reason && <p className="text-sm break-words whitespace-pre-wrap">Denial reason: {progress.denial_reason}</p>}
      <div className="space-y-3"><h3 className="font-semibold">Authorization history</h3>{history.length === 0 ? <p className="text-sm text-muted-foreground">No changes recorded.</p> : <ol className="divide-y">{history.map(event => {
        const before = event.previous_values as Record<string, unknown>;
        const after = event.new_values as Record<string, unknown>;
        return <li key={event.id} className="py-3 space-y-1 text-sm"><p className="font-medium">{event.actor_name} · {event.source === "assessment" ? "Assessment update" : "Authorization update"}</p><p className="text-xs text-muted-foreground">Recorded {new Date(event.changed_at).toLocaleString("en-US", { timeZone: "America/Chicago" })}</p>{milestones.filter(([key]) => before[key] !== after[key]).map(([key, label]) => <p key={key}>{label}: {authorizationDate(typeof before[key] === "string" ? before[key] : null)} → {authorizationDate(typeof after[key] === "string" ? after[key] : null)}</p>)}{before.denial_reason !== after.denial_reason && <p className="break-words whitespace-pre-wrap">Denial reason: {typeof before.denial_reason === "string" ? before.denial_reason : "—"} → {typeof after.denial_reason === "string" ? after.denial_reason : "—"}</p>}</li>;
      })}</ol>}</div>
    </>}
    <Dialog open={editing && isAdmin} onOpenChange={open => { if (!saving) setEditing(open); }}><DialogContent aria-describedby={undefined} className="max-w-lg max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Edit authorization progress</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-5"><ClientAuthorizationFields value={draft} onChange={setDraft} disabled={saving} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save authorization</Button></div></form></DialogContent></Dialog>
    <AlertDialog open={clearing} onOpenChange={open => { if (!saving) setClearing(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Clear authorization entries?</AlertDialogTitle><AlertDialogDescription>Submitted and decision dates will be cleared. Assessment dates and the full change history will be kept.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={e => { e.preventDefault(); void save(true); }}>{saving ? "Clearing…" : "Clear entries"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}