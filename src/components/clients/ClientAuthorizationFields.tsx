import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuthorizationDraft } from "@/utils/clientAuthorization";

export function ClientAuthorizationFields({ value, onChange, disabled = false }: { value: AuthorizationDraft; onChange: (value: AuthorizationDraft) => void; disabled?: boolean }) {
  const id = useId();
  const change = (patch: Partial<AuthorizationDraft>) => onChange({ ...value, ...patch });
  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    <div className="flex items-center gap-2"><Checkbox id={`${id}-submitted`} checked={value.submitted} disabled={disabled} onCheckedChange={checked => change({ submitted: checked === true })} /><Label htmlFor={`${id}-submitted`}>Authorization submitted</Label></div>
    {value.submitted && <div className="space-y-2"><Label htmlFor={`${id}-submitted-on`}>Date submitted *</Label><Input id={`${id}-submitted-on`} type="date" required value={value.submittedOn} onChange={e => change({ submittedOn: e.target.value })} /></div>}
    <div className="space-y-2"><Label htmlFor={`${id}-decision`}>Authorization decision</Label><Select disabled={disabled} value={value.decision} onValueChange={decision => { if (decision === "none" || decision === "approved" || decision === "denied") change({ decision, decisionOn: "", reason: "" }); }}><SelectTrigger id={`${id}-decision`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No decision</SelectItem><SelectItem value="approved">Authorization approved</SelectItem><SelectItem value="denied">Authorization denied</SelectItem></SelectContent></Select></div>
    {value.decision !== "none" && <div className="space-y-2"><Label htmlFor={`${id}-decision-on`}>{value.decision === "approved" ? "Date approved *" : "Date denied *"}</Label><Input id={`${id}-decision-on`} type="date" required min={value.submitted ? value.submittedOn || undefined : undefined} value={value.decisionOn} onChange={e => change({ decisionOn: e.target.value })} /></div>}
    {value.decision === "denied" && <div className="space-y-2"><Label htmlFor={`${id}-reason`}>Denial reason *</Label><Textarea id={`${id}-reason`} required maxLength={2000} rows={3} value={value.reason} onChange={e => change({ reason: e.target.value })} /></div>}
  </fieldset>;
}