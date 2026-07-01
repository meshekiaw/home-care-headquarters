import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Appointment } from "@/hooks/useAppointments";
import { checkSchedulingConflicts, type ConflictResult } from "@/hooks/useSchedulingConflicts";
import { ConflictAlert } from "./ConflictAlert";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Caregiver {
  id: string;
  first_name: string;
  last_name: string;
  cleared_to_schedule: boolean | null;
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedHour?: number;
  appointment?: Appointment;
  onSave: (appointment: Omit<Appointment, "id" | "created_at" | "updated_at" | "client" | "caregiver">) => Promise<unknown>;
  onUpdate?: (id: string, updates: Partial<Appointment>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedHour,
  appointment,
  onSave,
  onUpdate,
  onDelete,
}: AppointmentDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflict, setConflict] = useState<ConflictResult | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client_id: "",
    caregiver_id: "",
    start_time: "",
    end_time: "",
    status: "scheduled",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchClientsAndCaregivers();
      if (appointment) {
        setFormData({
          title: appointment.title,
          description: appointment.description || "",
          client_id: appointment.client_id,
          caregiver_id: appointment.caregiver_id,
          start_time: format(new Date(appointment.start_time), "HH:mm"),
          end_time: format(new Date(appointment.end_time), "HH:mm"),
          status: appointment.status,
          notes: appointment.notes || "",
        });
      } else {
        const hour = selectedHour !== undefined ? selectedHour : 9;
        setFormData({
          title: "",
          description: "",
          client_id: "",
          caregiver_id: "",
          start_time: `${hour.toString().padStart(2, "0")}:00`,
          end_time: `${(hour + 1).toString().padStart(2, "0")}:00`,
          status: "scheduled",
          notes: "",
        });
      }
      setConflict(null);
    }
  }, [open, appointment, selectedDate, selectedHour]);

  const fetchClientsAndCaregivers = async () => {
    setLoading(true);
    try {
      const [clientsRes, caregiversRes] = await Promise.all([
        supabase.from("clients").select("id, first_name, last_name").eq("status", "active"),
        supabase.from("caregivers").select("id, first_name, last_name, cleared_to_schedule").eq("status", "active"),
      ]);

      if (clientsRes.data) setClients(clientsRes.data);
      if (caregiversRes.data) setCaregivers(caregiversRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const runConflictCheck = async (caregiverId: string, startTime: string, endTime: string) => {
    if (!caregiverId || !startTime || !endTime) return;

    setCheckingConflicts(true);
    try {
      const startDateTime = new Date(selectedDate);
      const [startHour, startMin] = startTime.split(":").map(Number);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(selectedDate);
      const [endHour, endMin] = endTime.split(":").map(Number);
      endDateTime.setHours(endHour, endMin, 0, 0);

      const conflictInfo = await checkSchedulingConflicts(
        caregiverId,
        startDateTime,
        endDateTime,
        appointment?.id
      );
      setConflict(conflictInfo);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleCaregiverChange = async (caregiverId: string) => {
    setFormData((prev) => ({ ...prev, caregiver_id: caregiverId }));
    await runConflictCheck(caregiverId, formData.start_time, formData.end_time);
  };

  const handleTimeChange = async (field: "start_time" | "end_time", value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    await runConflictCheck(
      formData.caregiver_id,
      field === "start_time" ? value : formData.start_time,
      field === "end_time" ? value : formData.end_time
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const startDateTime = new Date(selectedDate);
      const [startHour, startMin] = formData.start_time.split(":").map(Number);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(selectedDate);
      const [endHour, endMin] = formData.end_time.split(":").map(Number);
      endDateTime.setHours(endHour, endMin, 0, 0);

      const appointmentData = {
        user_id: user.id,
        client_id: formData.client_id,
        caregiver_id: formData.caregiver_id,
        title: formData.title,
        description: formData.description || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: formData.status,
        notes: formData.notes || null,
      };

      if (appointment && onUpdate) {
        await onUpdate(appointment.id, appointmentData);
      } else {
        await onSave(appointmentData);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving appointment:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (appointment && onDelete) {
      setSaving(true);
      try {
        await onDelete(appointment.id);
        onOpenChange(false);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Daily Care Visit"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, client_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caregiver">Caregiver</Label>
              <Select
                value={formData.caregiver_id}
                onValueChange={handleCaregiverChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select caregiver" />
                </SelectTrigger>
                <SelectContent>
                  {caregivers.map((caregiver) => (
                    <SelectItem key={caregiver.id} value={caregiver.id}>
                      {caregiver.first_name} {caregiver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {checkingConflicts && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking for conflicts...
            </div>
          )}

          {conflict && <ConflictAlert conflict={conflict} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => handleTimeChange("start_time", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => handleTimeChange("end_time", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Appointment details..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2">
            {appointment && onDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || (conflict?.hasConflict ?? false)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {appointment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
