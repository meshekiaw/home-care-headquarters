import { useState, useEffect, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedCaregivers, setSelectedCaregivers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
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
        toast({ title: "Error loading caregivers", description: error.message, variant: "destructive" });
        setCaregivers([]);
      } else {
        setCaregivers(data || []);
      }
      setLoadingCaregivers(false);
    };
    load();
    return () => { cancelled = true; };
  }, [open, toast]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return activeCourses;
    return activeCourses.filter((c) => c.title.toLowerCase().includes(q));
  }, [activeCourses, courseSearch]);

  const filteredCaregivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return caregivers;
    return caregivers.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q));
  }, [caregivers, search]);

  const toggleCourse = (id: string) =>
    setSelectedCourses((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const toggleCaregiver = (id: string) =>
    setSelectedCaregivers((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const allCoursesSelected =
    filteredCourses.length > 0 && filteredCourses.every((c) => selectedCourses.includes(c.id));
  const allCaregiversSelected =
    filteredCaregivers.length > 0 && filteredCaregivers.every((c) => selectedCaregivers.includes(c.id));

  const toggleAllCourses = () => {
    if (allCoursesSelected) {
      const ids = new Set(filteredCourses.map((c) => c.id));
      setSelectedCourses((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedCourses((prev) => Array.from(new Set([...prev, ...filteredCourses.map((c) => c.id)])));
    }
  };

  const toggleAllCaregivers = () => {
    if (allCaregiversSelected) {
      const ids = new Set(filteredCaregivers.map((c) => c.id));
      setSelectedCaregivers((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedCaregivers((prev) => Array.from(new Set([...prev, ...filteredCaregivers.map((c) => c.id)])));
    }
  };

  const handleSubmit = async () => {
    if (selectedCourses.length === 0 || selectedCaregivers.length === 0) return;
    setSaving(true);
    const allAssignmentIds: string[] = [];
    let anyFail = false;
    for (const courseId of selectedCourses) {
      const result = await assignCourse(courseId, selectedCaregivers, dueDate || undefined);
      if (!result?.ok) anyFail = true;
      if (result?.assignmentIds?.length) allAssignmentIds.push(...result.assignmentIds);
    }
    if (allAssignmentIds.length > 0) {
      try {
        const { invokeWithRefresh } = await import("@/lib/invokeWithRefresh");
        const { error } = await invokeWithRefresh("send-lms-assignment-notification", {
          body: { assignment_ids: allAssignmentIds },
        });
        if (error) throw error;
        toast({
          title: "Notifications sent",
          description: `${allAssignmentIds.length} assignment(s) created across ${selectedCourses.length} course(s).`,
        });
      } catch (e: any) {
        toast({
          title: "Assignments saved, notification failed",
          description: e.message || "Could not send notification email.",
          variant: "destructive",
        });
      }
    }
    setSaving(false);
    if (anyFail) return;
    setSelectedCourses([]);
    setSelectedCaregivers([]);
    setDueDate("");
    setSearch("");
    setCourseSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Courses to Caregivers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Courses *</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllCourses}
                disabled={loadingCourses || filteredCourses.length === 0}
              >
                {allCoursesSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="pl-8"
                disabled={loadingCourses}
              />
            </div>
            <ScrollArea className="h-40 rounded-md border p-3">
              {loadingCourses ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Loading courses...</span>
                </div>
              ) : filteredCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {activeCourses.length === 0 ? "No active courses. Add one first." : "No courses match."}
                </p>
              ) : (
                filteredCourses.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2">
                    <Checkbox
                      checked={selectedCourses.includes(c.id)}
                      onCheckedChange={() => toggleCourse(c.id)}
                    />
                    <span className="text-sm">{c.title}</span>
                  </div>
                ))
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground mt-1">{selectedCourses.length} course(s) selected</p>
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
                onClick={toggleAllCaregivers}
                disabled={loadingCaregivers || filteredCaregivers.length === 0}
              >
                {allCaregiversSelected ? "Deselect All" : "Select All"}
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
            <ScrollArea className="h-40 rounded-md border p-3">
              {loadingCaregivers ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Loading caregivers...</span>
                </div>
              ) : filteredCaregivers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {caregivers.length === 0 ? "No active caregivers found." : "No caregivers match your search."}
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
              {selectedCaregivers.length} caregiver(s) selected
            </p>
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Will create up to {selectedCourses.length * selectedCaregivers.length} assignment(s)
            (skips caregivers already assigned to a given course).
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              loading={saving}
              disabled={selectedCourses.length === 0 || selectedCaregivers.length === 0}
            >
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
