import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLmsCourses, useLmsAssignments } from "@/hooks/useLmsCourses";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Caregiver {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

export default function AssignCourseDialog({ open, onOpenChange }: Props) {
  const { courses } = useLmsCourses();
  const { assignCourse } = useLmsAssignments();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedCaregivers, setSelectedCaregivers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase
        .from("caregivers")
        .select("id, first_name, last_name, status")
        .eq("status", "active")
        .then(({ data }) => setCaregivers(data || []));
    }
  }, [open]);

  const toggleCaregiver = (id: string) => {
    setSelectedCaregivers((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedCaregivers.length === caregivers.length) {
      setSelectedCaregivers([]);
    } else {
      setSelectedCaregivers(caregivers.map((c) => c.id));
    }
  };

  const handleSubmit = async () => {
    if (!selectedCourse || selectedCaregivers.length === 0) return;
    setSaving(true);
    await assignCourse(selectedCourse, selectedCaregivers, dueDate || undefined);
    setSaving(false);
    setSelectedCourse(""); setSelectedCaregivers([]); setDueDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Course to Caregivers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select Course *</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Caregivers *</Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedCaregivers.length === caregivers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <ScrollArea className="h-48 rounded-md border p-3">
              {caregivers.map((cg) => (
                <div key={cg.id} className="flex items-center gap-3 py-2">
                  <Checkbox
                    checked={selectedCaregivers.includes(cg.id)}
                    onCheckedChange={() => toggleCaregiver(cg.id)}
                  />
                  <span className="text-sm">{cg.first_name} {cg.last_name}</span>
                </div>
              ))}
              {caregivers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active caregivers found.</p>
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground mt-1">{selectedCaregivers.length} selected</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!selectedCourse || selectedCaregivers.length === 0}>
              Assign to {selectedCaregivers.length} Caregiver(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
