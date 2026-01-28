import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface AddCaregiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (caregiver: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    status: string;
    hourly_rate?: number;
    specializations?: string[];
  }) => Promise<any>;
}

const SPECIALIZATION_OPTIONS = [
  "Senior Care",
  "Dementia Care",
  "Alzheimer's Care",
  "Physical Therapy",
  "Pediatric Care",
  "Post-Surgical Care",
  "Hospice Care",
  "Diabetic Care",
  "Wound Care",
  "Companionship",
];

export default function AddCaregiverDialog({ open, onOpenChange, onAdd }: AddCaregiverDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    status: "active",
    hourly_rate: "",
    specializations: [] as string[],
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onAdd({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        status: formData.status,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        specializations: formData.specializations.length > 0 ? formData.specializations : undefined,
      });
      onOpenChange(false);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        status: "active",
        hourly_rate: "",
        specializations: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const addSpecialization = (spec: string) => {
    if (!formData.specializations.includes(spec)) {
      setFormData((f) => ({ ...f, specializations: [...f.specializations, spec] }));
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData((f) => ({ ...f, specializations: f.specializations.filter((s) => s !== spec) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Caregiver</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData((f) => ({ ...f, first_name: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData((f) => ({ ...f, last_name: e.target.value }))}
                placeholder="Smith"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData((f) => ({ ...f, hourly_rate: e.target.value }))}
                placeholder="25.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Specializations</Label>
            {formData.specializations.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.specializations.map((spec) => (
                  <Badge key={spec} variant="secondary" className="gap-1">
                    {spec}
                    <button onClick={() => removeSpecialization(spec)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 border rounded-lg bg-muted/50">
              {SPECIALIZATION_OPTIONS.filter((s) => !formData.specializations.includes(s)).map(
                (spec) => (
                  <Badge
                    key={spec}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => addSpecialization(spec)}
                  >
                    {spec}
                  </Badge>
                )
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.first_name || !formData.last_name || loading}
            loading={loading}
          >
            Add Caregiver
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
