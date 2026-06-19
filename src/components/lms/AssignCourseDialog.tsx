import { useState, useEffect, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLmsCourses, useLmsAssignments } from "@/hooks/useLmsCourses";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { courses, loading: loadingCourses } = useLmsCourses();
  const activeCourses = useMemo(() => courses.filter((c) => c.is_active), [courses]);
  const { assignCourse } = useLmsAssignments();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedCaregivers, setSelectedCaregivers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoadingCaregivers(true);
      const { data, error } = await supabase
        .from("caregivers")
        .select("id, first_name, last_name, status")
        .eq("status", "active")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load caregivers", error);
        toast({
          title: "Error loading caregivers",
          description: error.message,
          variant: "destructive",
        });
        setCaregivers([]);
      } else {
        setCaregivers(data || []);
      }
      setLoadingCaregivers(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const filteredCaregivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return caregivers;
    return caregivers.filter((c) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
    );
  }, [caregivers, search]);

  const toggleCaregiver = (id: string) => {
    setSelectedCaregivers((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    filteredCaregivers.length > 0 &&
    filteredCaregivers.every((c) => selectedCaregivers.includes(c.id));

  const selectAll = () => {
    if (allFilteredSelected) {
      const ids = new Set(filteredCaregivers.map((c) => c.id));
      setSelectedCaregivers((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedCaregivers((prev) => {
        const set = new Set(prev);
        filteredCaregivers.forEach((c) => set.add(c.id));
        return Array.from(set);
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedCourse || selectedCaregivers.length === 0) return;
    setSaving(true);
    const result = await assignCourse(selectedCourse, selectedCaregivers, dueDate || undefined);
    if (result?.assignmentIds?.length) {
      try {
        const { error } = await supabase.functions.invoke("send-lms-assignment-notification", {
          body: { assignment_ids: result.assignmentIds },
        });
        if (error) throw error;
        toast({ title: "Notifications sent", description: `Notified ${selectedCaregivers.length} caregiver(s).` });
      } catch (e: any) {
        toast({
          title: "Assignment saved, notification failed",
          description: e.message || "Could not send notification email.",
          variant: "destructive",
        });
      }
    }
    setSaving(false);
    if (!result?.ok) return;
    setSelectedCourse("");
    setSelectedCaregivers([]);
    setDueDate("");
    setSearch("");
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
            <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={loadingCourses || activeCourses.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={loadingCourses ? "Loading courses..." : activeCourses.length === 0 ? "No active courses available" : "Choose a course"} />
              </SelectTrigger>
              <SelectContent>
                {activeCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingCourses && activeCourses.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Add a course from the Courses tab before assigning.
              </p>
            )}
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Caregivers *</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={loadingCaregivers || filteredCaregivers.length === 0}
              >
                {allFilteredSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search caregivers by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                disabled={loadingCaregivers}
              />
            </div>
            <ScrollArea className="h-48 rounded-md border p-3">
              {loadingCaregivers ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Loading caregivers...</span>
                </div>
              ) : filteredCaregivers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {caregivers.length === 0
                    ? "No active caregivers found."
                    : "No caregivers match your search."}
                </p>
              ) : (
                filteredCaregivers.map((cg) => (
                  <div key={cg.id} className="flex items-center gap-3 py-2">
                    <Checkbox
                      checked={selectedCaregivers.includes(cg.id)}
                      onCheckedChange={() => toggleCaregiver(cg.id)}
                    />
                    <span className="text-sm">{cg.first_name} {cg.last_name}</span>
                  </div>
                ))
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedCaregivers.length} selected
              {!loadingCaregivers && ` · ${filteredCaregivers.length} of ${caregivers.length} shown`}
            </p>
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
