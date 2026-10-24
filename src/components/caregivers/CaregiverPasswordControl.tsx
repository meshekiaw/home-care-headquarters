import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { caregiverPasswordSchema } from "@/utils/caregiverPassword";

type Props = { caregiverId: string; caregiverName: string };

export default function CaregiverPasswordControl({ caregiverId, caregiverName }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  const changeOpen = (next: boolean) => {
    if (saving) return;
    setOpen(next);
    setPassword(""); setConfirmPassword(""); setConfirmed(false); setVisible(false); setErrorMessage("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const parsed = caregiverPasswordSchema.safeParse({ password, confirmPassword, confirmed });
    if (!parsed.success) { setErrorMessage(parsed.error.issues[0]?.message ?? "Review the password."); return; }
    setSaving(true); setErrorMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("caregiver-login-password", {
        body: { caregiver_id: caregiverId, password: parsed.data.password },
      });
      if (error || data?.error || data?.success !== true) {
        let message = "We could not confirm the password change. Check the audit log before trying again.";
        // Edge Functions return actionable, sanitized messages even on non-success responses.
        if (typeof data?.error === "string") message = data.error;
        else if (error && "context" in error && error.context instanceof Response) {
          const payload = await error.context.json().catch(() => null);
          if (typeof payload?.error === "string") message = payload.error;
        }
        setErrorMessage(message);
        toast({ title: "Password change not confirmed", description: message, variant: "destructive" });
        return;
      }
      setPassword(""); setConfirmPassword(""); setConfirmed(false); setVisible(false); setOpen(false);
      toast({ title: "Temporary password set", description: `Share the new password directly with ${caregiverName}. No email was sent.` });
    } catch {
      const message = "We could not confirm the password change. Check the audit log before trying again.";
      setErrorMessage(message);
      toast({ title: "Password change not confirmed", description: message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return <>
    <Button variant="outline" onClick={() => changeOpen(true)}>
      <KeyRound aria-hidden="true" />Set temporary password
    </Button>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" onInteractOutside={event => { if (saving) event.preventDefault(); }} onEscapeKeyDown={event => { if (saving) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Set temporary password</DialogTitle>
          <DialogDescription className="break-words">
            Replace the existing login password for {caregiverName}. No reset email is sent. Share the password directly; it stays valid until changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caregiver-temporary-password">Temporary password</Label>
            <div className="relative">
              <Input id="caregiver-temporary-password" type={visible ? "text" : "password"} autoComplete="new-password" maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={saving} className="pr-12" aria-describedby="caregiver-password-minimum" />
              <Button type="button" size="icon" variant="ghost" className="absolute right-0 top-0" disabled={saving} aria-label={visible ? "Hide password" : "Show password"} title={visible ? "Hide password" : "Show password"} onClick={() => setVisible(value => !value)}>
                {visible ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            <p id="caregiver-password-minimum" className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="caregiver-confirm-password">Confirm temporary password</Label>
            <Input id="caregiver-confirm-password" type="password" autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} disabled={saving} />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="caregiver-confirm-reset" checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={saving} />
            <Label htmlFor="caregiver-confirm-reset" className="leading-5">I confirm I want to replace this caregiver’s current password.</Label>
          </div>
          {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={!confirmed}>Set temporary password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}