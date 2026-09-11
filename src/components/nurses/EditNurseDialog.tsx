import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export interface EditableNurse {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  license_state: string | null;
  status: string;
  specializations?: string[] | null;
  receives_618_notifications?: boolean | null;
}

interface Props {
  nurse: EditableNurse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditNurseDialog({ nurse, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    specializations: "",
    license_state: "",
    status: "active",
    receives_618_notifications: false,
  });

  useEffect(() => {
    if (!nurse) return;
    setForm({
      first_name: nurse.first_name ?? "",
      last_name: nurse.last_name ?? "",
      email: nurse.email ?? "",
      phone: nurse.phone ?? "",
      specializations: (nurse.specializations ?? []).join(", "),
      license_state: nurse.license_state ?? "",
      status: nurse.status ?? "active",
      receives_618_notifications: !!nurse.receives_618_notifications,
    });
  }, [nurse]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nurse) return;
    setSaving(true);
    try {
      const newEmail = form.email.trim().toLowerCase();
      const oldEmail = (nurse.email ?? "").trim().toLowerCase();
      const goingInactive = form.status !== "active";

      const { error } = await supabase
        .from("nurses")
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: newEmail || null,
          phone: form.phone.trim() || null,
          specializations: form.specializations
            ? form.specializations.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
          license_state: form.license_state || null,
          status: form.status,
          receives_618_notifications: goingInactive ? false : form.receives_618_notifications,
        })
        .eq("id", nurse.id);
      if (error) throw error;

      const notes: string[] = [];

      if (oldEmail && newEmail && oldEmail !== newEmail) {
        const { data, error: fnErr } = await supabase.functions.invoke("manage-nurse-account", {
          body: { action: "email_changed", email: oldEmail, new_email: newEmail },
        });
        if (fnErr) {
          notes.push("Their previous invite link may still work — send a new invite.");
        } else if ((data as { invalidated?: boolean })?.invalidated) {
          notes.push("Their old sign-in link no longer works — send a new invite.");
        }
      }

      if (goingInactive && newEmail) {
        await supabase.functions.invoke("manage-nurse-account", {
          body: { action: "deactivate", email: newEmail },
        });
        notes.push("Sign-in blocked and 618 alerts turned off. History is kept.");
      }
      if (!goingInactive && nurse.status !== "active" && newEmail) {
        await supabase.functions.invoke("manage-nurse-account", {
          body: { action: "reactivate", email: newEmail },
        });
        notes.push("Sign-in restored.");
      }

      toast({
        title: "Nurse updated",
        description: [`${form.first_name} ${form.last_name} saved.`, ...notes].join(" "),
      });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: "Could not save changes", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Nurse</DialogTitle>
          <DialogDescription>Changes update this existing record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">First Name *</Label>
              <Input
                id="edit_first_name"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Last Name *</Label>
              <Input
                id="edit_last_name"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_spec">Specialization</Label>
            <Input
              id="edit_spec"
              placeholder="Geriatric Care, Wound Care"
              value={form.specializations}
              onChange={(e) => setForm((f) => ({ ...f, specializations: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Separate multiple entries with commas.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>License State</Label>
              <Select
                value={form.license_state || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, license_state: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {US_STATES.map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="edit_618">618 Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Email alerts for new and upcoming 618 assessments.
              </p>
            </div>
            <Switch
              id="edit_618"
              checked={form.status === "active" && form.receives_618_notifications}
              disabled={form.status !== "active"}
              onCheckedChange={(v) => setForm((f) => ({ ...f, receives_618_notifications: v }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
