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
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    service_radius_miles?: number;
    date_of_birth?: string;
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
    address: "",
    city: "",
    state: "",
    zip_code: "",
    service_radius_miles: "25",
    ssn: "",
    date_of_birth: "",
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
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zip_code || undefined,
        service_radius_miles: formData.service_radius_miles ? parseInt(formData.service_radius_miles) : undefined,
        date_of_birth: formData.date_of_birth || undefined,
        date_of_birth: formData.date_of_birth || undefined,
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
        address: "",
        city: "",
        state: "",
        zip_code: "",
        service_radius_miles: "25",
        ssn: "",
        date_of_birth: "",
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData((f) => ({ ...f, date_of_birth: e.target.value }))}
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

          {/* Location Section */}
          <div className="pt-4 border-t">
            <Label className="text-base font-semibold">Location (for proximity matching)</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Add location to match caregivers with nearby clients
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))}
                    placeholder="San Francisco"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData((f) => ({ ...f, state: e.target.value }))}
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zip Code</Label>
                  <Input
                    value={formData.zip_code}
                    onChange={(e) => setFormData((f) => ({ ...f, zip_code: e.target.value }))}
                    placeholder="94102"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Service Radius (miles)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.service_radius_miles}
                  onChange={(e) => setFormData((f) => ({ ...f, service_radius_miles: e.target.value }))}
                  placeholder="25"
                />
              </div>
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
