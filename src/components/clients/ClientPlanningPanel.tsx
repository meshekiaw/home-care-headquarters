import { useEffect, useState } from "react";
import { Edit, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientPlanningFields } from "./ClientPlanningFields";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendlyError";
import type { Tables } from "@/integrations/supabase/types";
import { clientPayerLabel, clientPlanningDraft, clientPlanningPayload, clientStatusLabel, readRequestedSchedule, requestedScheduleSummary, type ClientPlanningRecord } from "@/utils/clientPlanning";
import { formatDateOnly } from "@/utils/dateOnly";

export function ClientPlanningPanel({ client, onSaved }: { client: ClientPlanningRecord & { id: string }; onSaved: () => void }) {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => clientPlanningDraft(client));
  const [history, setHistory] = useState<Tables<"client_status_history">[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setHistoryError(false);
    void supabase.from("client_status_history").select("*").eq("client_id", client.id).order("changed_at", { ascending: false }).order("id").then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setHistoryError(true);
        toast({ title: "Unable to load status history", description: friendlyError(error), variant: "destructive" });
      } else setHistory(data ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [client.id, refresh, toast]);
  const save = async () => {
    if (!isAdmin || saving) return;
    setSaving(true);
    try {
      const payload = clientPlanningPayload(draft);
      const { error } = await supabase.from("clients").update(payload).eq("id", client.id).select("id").single();
      if (error) throw error;
      toast({ title: "Client details saved" });
      setEditing(false);
      setRefresh(value => value + 1);
      onSaved();
    } catch (error) { toast({ title: "Unable to save client details", description: friendlyError(error), variant: "destructive" }); }
    finally { setSaving(false); }
  };
  return <section className="space-y-5 border-b pb-6 mb-6">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Payer, schedule & client status</h2>{isAdmin && <Button variant="outline" size="sm" onClick={() => { setDraft(clientPlanningDraft(client)); setEditing(true); }}><Edit className="w-4 h-4 mr-2" />Edit</Button>}</div>
    <dl className="grid gap-4 sm:grid-cols-2">
      <div><dt className="text-sm text-muted-foreground">Payer</dt><dd className="font-medium break-words">{clientPayerLabel(client)}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Client status</dt><dd><Badge variant="outline">{clientStatusLabel(client.client_status)}</Badge></dd></div>
      <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Requested schedule</dt><dd className="font-medium break-words">{requestedScheduleSummary(readRequestedSchedule(client.requested_schedule))}</dd></div>
      {client.requested_schedule_notes && <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Requested schedule notes</dt><dd className="whitespace-pre-wrap break-words">{client.requested_schedule_notes}</dd></div>}
      {client.client_status_date && <div><dt className="text-sm text-muted-foreground">{client.client_status === "hospitalized" ? "Admit date" : "Status date"}</dt><dd>{formatDateOnly(client.client_status_date)}</dd></div>}
      {client.expected_return_date && <div><dt className="text-sm text-muted-foreground">Expected return date</dt><dd>{formatDateOnly(client.expected_return_date)}</dd></div>}
      {client.client_status_reason && <div><dt className="text-sm text-muted-foreground">Reason</dt><dd className="break-words whitespace-pre-wrap">{client.client_status_reason}</dd></div>}
    </dl>
    <div className="space-y-3"><h3 className="font-semibold">Client status history</h3>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-label="Loading status history" /> : historyError ? <Button variant="outline" size="sm" onClick={() => setRefresh(n => n + 1)}>Retry status history</Button> : history.length === 0 ? <p className="text-sm text-muted-foreground">No status changes recorded.</p> : <ol className="divide-y">{history.map(event => <li key={event.id} className="py-3 space-y-1 text-sm">
        <p className="font-medium">{clientStatusLabel(event.previous_status)} → {clientStatusLabel(event.new_status)}</p>
        <p>{formatDateOnly(event.effective_date)} · {event.actor_name}</p>
        {event.expected_return_date && <p>Expected return: {formatDateOnly(event.expected_return_date)}</p>}
        {event.reason && <p className="whitespace-pre-wrap break-words">{event.reason}</p>}
        <p className="text-xs text-muted-foreground">Recorded {new Date(event.changed_at).toLocaleString()}</p>
      </li>)}</ol>}
    </div>
    <Dialog open={editing && isAdmin} onOpenChange={open => { if (!saving) setEditing(open); }}><DialogContent aria-describedby={undefined} className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Edit payer, schedule & client status</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-4"><ClientPlanningFields value={draft} onChange={setDraft} disabled={saving} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save</Button></div></form>
    </DialogContent></Dialog>
  </section>;
}