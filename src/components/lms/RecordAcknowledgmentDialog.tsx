import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLmsPolicies } from "@/hooks/useLmsPolicies";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
}

interface Caregiver {
  id: string;
  first_name: string;
  last_name: string;
}

export default function RecordAcknowledgmentDialog({ open, onOpenChange, policyId }: Props) {
  const { recordAcknowledgment, getAcknowledgmentsForPolicy } = useLmsPolicies();
  const [selectedCaregiver, setSelectedCaregiver] = useState("");
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [saving, setSaving] = useState(false);

  const existingAcks = getAcknowledgmentsForPolicy(policyId);
  const acknowledgedIds = new Set(existingAcks.map((a) => a.caregiver_id));

  useEffect(() => {
    if (open) {
      supabase
        .from("caregivers")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .then(({ data }) => setCaregivers(data || []));
    }
  }, [open]);

  const unacknowledgedCaregivers = caregivers.filter((c) => !acknowledgedIds.has(c.id));

  const handleSubmit = async () => {
    if (!selectedCaregiver) return;
    setSaving(true);
    await recordAcknowledgment(policyId, selectedCaregiver);
    setSaving(false);
    setSelectedCaregiver("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Policy Acknowledgment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select Caregiver</Label>
            <Select value={selectedCaregiver} onValueChange={setSelectedCaregiver}>
              <SelectTrigger><SelectValue placeholder="Choose a caregiver" /></SelectTrigger>
              <SelectContent>
                {unacknowledgedCaregivers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unacknowledgedCaregivers.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">All caregivers have acknowledged this policy.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!selectedCaregiver}>
              Record Acknowledgment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
