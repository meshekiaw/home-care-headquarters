import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useCaregiverSignInAccess } from "@/hooks/useCaregiverSignInAccess";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ACCESS_LABELS, type CaregiverAccess } from "@/utils/caregiverSignInAccess";

const EVENT_LABELS = { requested: "Access requested", account_created: "Confirmed account created", succeeded: "Access ready", failed: "Setup not finished" };
type Props = { isAdmin: boolean; caregiverId: string; profileEmail: string | null; profileName: string; onSaved: () => void };

export default function CaregiverSignInAccess({ isAdmin, caregiverId, profileEmail, profileName, onSaved }: Props) {
  const query = useCaregiverSignInAccess(isAdmin, caregiverId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState<CaregiverAccess | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  if (!isAdmin) return null;
  const access = query.data?.[0];
  const profileCurrent = access?.email === (profileEmail ?? "").replace(/\s/g, "").toLowerCase() && access?.caregiver_name === profileName;
  const refresh = () => { setErrorMessage(""); void query.refetch(); };
  const submit = async () => {
    if (!confirmation || saving) return;
    setSaving(true); setErrorMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("caregiver-sign-in-access", { body: {
        caregiver_id: caregiverId, confirmed_email: confirmation.email, confirmed_name: confirmation.caregiver_name, confirmed: true,
      } });
      if (error || data?.success !== true) {
        let message = data?.error;
        if (!message && error && "context" in error && error.context instanceof Response) {
          const payload = await error.context.json().catch(() => null); message = payload?.error;
        }
        throw new Error(typeof message === "string" ? message : "Access could not be confirmed. Review the current status and log.");
      }
      setConfirmation(null);
      toast({ title: "Caregiver access ready", description: "All 12 training sessions are assigned. No password was set and no email was sent." });
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Access could not be confirmed.";
      setErrorMessage(message); setConfirmation(null);
      toast({ title: "Access not confirmed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
      await queryClient.invalidateQueries({ queryKey: ["caregiver-sign-in-access"] });
    }
  };
  return <section aria-label="Sign-in access" className="border-y border-border py-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Sign-in access</h2>
        {query.isLoading ? <p role="status" className="text-sm text-muted-foreground">Checking sign-in access…</p> : access && <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={access.state === "ready" ? "success" : "secondary"}>{ACCESS_LABELS[access.state]}</Badge>
          <span className="break-all">{access.state === "ready" ? access.account_email : access.email}</span>
        </div>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Refresh sign-in access" title="Refresh sign-in access" disabled={saving || query.isFetching} onClick={refresh}><RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button>
        {access && access.state !== "ready" && <Button variant="outline" disabled={saving || query.isFetching || !profileCurrent || !!access.problem || access.state === "no_email"} onClick={() => { setErrorMessage(""); setConfirmation(access); }}>
          <KeyRound className="h-4 w-4" />{access.state === "not_set_up" ? "Fix access" : "Give caregiver access"}
        </Button>}
      </div>
    </div>
    {query.isError && <p role="alert" className="text-sm text-destructive">Could not check sign-in access. Please refresh.</p>}
    {access?.state === "no_email" && <p className="text-sm text-muted-foreground">Add an email to her profile first.</p>}
    {access && !profileCurrent && <p className="text-sm text-warning">Profile changed. Refresh sign-in access before continuing.</p>}
    {access?.problem && <p role="alert" className="text-sm text-destructive break-words">{access.problem}</p>}
    {errorMessage && <p role="alert" className="text-sm text-destructive break-words">{errorMessage}</p>}
    <div className="border-t border-border pt-3 space-y-2">
      <h3 className="text-sm font-medium">Access log</h3>
      {!query.isLoading && !access?.history?.length && <p className="text-xs text-muted-foreground">No access changes recorded.</p>}
      <ul className="max-h-60 overflow-y-auto space-y-3">
        {access?.history?.map(event => <li key={event.id} className="text-xs space-y-1 break-words">
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><span className="font-medium">{EVENT_LABELS[event.event]}</span><time dateTime={event.created_at} className="text-muted-foreground">{new Date(event.created_at).toLocaleString()}</time></div>
          <p>{event.actor_email} · {event.caregiver_name} · {event.email}</p>
          {event.detail && <p className="text-muted-foreground">{event.detail}</p>}
        </li>)}
      </ul>
    </div>
    <AlertDialog open={!!confirmation} onOpenChange={open => { if (!open && !saving) setConfirmation(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Confirm caregiver access</AlertDialogTitle><AlertDialogDescription className="break-words">Give {confirmation?.caregiver_name} caregiver access using {confirmation?.email}?</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={event => { event.preventDefault(); void submit(); }}>{saving ? "Setting up access…" : "Confirm access"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}