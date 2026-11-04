import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLIENT_PAYERS, CLIENT_STATUSES, WEEK_DAYS, hoursLabel, requestedWeeklyHours, type ClientPlanningDraft } from "@/utils/clientPlanning";

export function ClientPlanningFields({ value, onChange, disabled = false }: { value: ClientPlanningDraft; onChange: (value: ClientPlanningDraft) => void; disabled?: boolean }) {
  const id = useId();
  const update = (patch: Partial<ClientPlanningDraft>) => onChange({ ...value, ...patch });
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-6 border-t pt-5">
      <section className="space-y-3">
        <h3 className="font-semibold">Payer</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {CLIENT_PAYERS.map(payer => <div key={payer} className="flex items-center gap-2">
            <Checkbox id={`${id}-${payer}`} disabled={disabled} checked={value.payers.includes(payer)} onCheckedChange={checked => update({ payers: checked === true ? [...value.payers, payer] : value.payers.filter(p => p !== payer) })} />
            <Label htmlFor={`${id}-${payer}`}>{payer}</Label>
          </div>)}
        </div>
        {value.payers.length === 0 && <p className="text-sm text-muted-foreground">Not set</p>}
        {value.payers.includes("Other") && <div className="space-y-2"><Label htmlFor={`${id}-other`}>Other payer *</Label><Input id={`${id}-other`} value={value.payerOther} maxLength={200} onChange={e => update({ payerOther: e.target.value })} /></div>}
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold">Requested schedule</h3>
        <div className="grid grid-cols-[minmax(90px,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 gap-y-3 items-center">
          <span className="text-xs text-muted-foreground">Day</span><span className="text-xs text-muted-foreground">Start time</span><span className="text-xs text-muted-foreground">End time</span>
          {WEEK_DAYS.map(day => {
            const row = value.schedule[day.key] ?? { enabled: false, start: "", end: "" };
            const setRow = (patch: Partial<typeof row>) => update({ schedule: { ...value.schedule, [day.key]: { ...row, ...patch } } });
            return <div className="contents" key={day.key}>
              <div className="flex items-center gap-2"><Checkbox id={`${id}-${day.key}`} checked={row.enabled} disabled={disabled} onCheckedChange={checked => setRow({ enabled: checked === true })} /><Label htmlFor={`${id}-${day.key}`} className="text-xs sm:text-sm">{day.label}</Label></div>
              <Input type="time" aria-label={`${day.label} start time`} className="min-w-0 px-1.5 sm:px-3 text-xs sm:text-sm" value={row.start} disabled={disabled || !row.enabled} onChange={e => setRow({ start: e.target.value })} />
              <Input type="time" aria-label={`${day.label} end time`} className="min-w-0 px-1.5 sm:px-3 text-xs sm:text-sm" value={row.end} disabled={disabled || !row.enabled} onChange={e => setRow({ end: e.target.value })} />
            </div>;
          })}
        </div>
        <p className="font-medium" aria-live="polite">Total requested hours per week: {hoursLabel(requestedWeeklyHours(value.schedule))}</p>
        {WEEK_DAYS.some(day => { const row = value.schedule[day.key]; return row?.enabled && row.end && row.start && row.end < row.start; }) && <p className="text-sm text-muted-foreground">End time is the next day.</p>}
        <div className="space-y-2"><Label htmlFor={`${id}-schedule-notes`}>Requested schedule notes</Label><Textarea id={`${id}-schedule-notes`} maxLength={2000} rows={3} value={value.scheduleNotes} onChange={e => update({ scheduleNotes: e.target.value })} /></div>
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold">Client status</h3>
        <Select value={value.status} disabled={disabled} onValueChange={status => update({ status, statusDate: "", expectedReturn: "", statusReason: "" })}>
          <SelectTrigger aria-label="Client status"><SelectValue /></SelectTrigger>
          <SelectContent>{CLIENT_STATUSES.map(status => <SelectItem value={status.value} key={status.value}>{status.label}</SelectItem>)}</SelectContent>
        </Select>
        {value.status !== "not_set" && <div className="space-y-2"><Label htmlFor={`${id}-status-date`}>{value.status === "hospitalized" ? "Admit date *" : ["on_hold", "discharged"].includes(value.status) ? "Status date *" : "Status date (optional)"}</Label><Input type="date" id={`${id}-status-date`} value={value.statusDate} onChange={e => update({ statusDate: e.target.value })} /></div>}
        {value.status === "hospitalized" && <div className="space-y-2"><Label htmlFor={`${id}-expected`}>Expected return date (optional)</Label><Input type="date" id={`${id}-expected`} min={value.statusDate || undefined} value={value.expectedReturn} onChange={e => update({ expectedReturn: e.target.value })} /></div>}
        {["on_hold", "discharged"].includes(value.status) && <div className="space-y-2"><Label htmlFor={`${id}-reason`}>Reason *</Label><Textarea id={`${id}-reason`} maxLength={2000} value={value.statusReason} onChange={e => update({ statusReason: e.target.value })} /></div>}
      </section>
    </fieldset>
  );
}