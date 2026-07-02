import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface LmsCourse {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_body: string | null;
  duration_minutes: number | null;
  is_required: boolean;
  required_for_role: string | null;
  category: string | null;
  passing_score: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LmsAssignment {
  id: string;
  user_id: string;
  course_id: string;
  caregiver_id: string;
  assigned_by: string | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  score: number | null;
  attempts: number;
  progress_percentage: number;
  started_at: string | null;
  certificate_url: string | null;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
  course?: LmsCourse;
  caregiver?: {
    first_name: string;
    last_name: string;
    email: string | null;
    status: string;
  };
}

export function useLmsCourses() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lms_courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCourses((data as LmsCourse[]) || []);
    } catch (error: any) {
      toast({ title: "Error loading courses", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const addCourse = async (course: Partial<LmsCourse>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("lms_courses").insert({ ...course, user_id: user.id } as any);
      if (error) throw error;
      toast({ title: "Course created" });
      fetchCourses();
    } catch (error: any) {
      toast({ title: "Error creating course", description: error.message, variant: "destructive" });
    }
  };

  const updateCourse = async (id: string, updates: Partial<LmsCourse>) => {
    try {
      const { error } = await supabase.from("lms_courses").update(updates as any).eq("id", id);
      if (error) throw error;
      toast({ title: "Course updated" });
      fetchCourses();
    } catch (error: any) {
      toast({ title: "Error updating course", description: error.message, variant: "destructive" });
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      const { error } = await supabase.from("lms_courses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Course deleted" });
      fetchCourses();
    } catch (error: any) {
      toast({ title: "Error deleting course", description: error.message, variant: "destructive" });
    }
  };

  return { courses, loading, addCourse, updateCourse, deleteCourse, refetch: fetchCourses };
}

export function useLmsAssignments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<LmsAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lms_assignments")
        .select(`*, lms_courses(*), caregivers(first_name, last_name, email, status)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const processed = (data || []).map((a: any) => ({
        ...a,
        course: a.lms_courses,
        caregiver: a.caregivers,
      }));
      setAssignments(processed);
    } catch (error: any) {
      toast({ title: "Error loading assignments", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const assignCourse = async (
    courseId: string,
    caregiverIds: string[],
    dueDate?: string
  ): Promise<{ ok: boolean; assignmentIds: string[]; skipped: number }> => {
    if (!user) return { ok: false, assignmentIds: [], skipped: 0 };
    try {
      // Filter out caregivers already assigned to this course
      const { data: existing, error: exErr } = await supabase
        .from("lms_assignments")
        .select("caregiver_id")
        .eq("course_id", courseId)
        .in("caregiver_id", caregiverIds);
      if (exErr) throw exErr;
      const existingIds = new Set((existing || []).map((r: any) => r.caregiver_id));
      const newIds = caregiverIds.filter((id) => !existingIds.has(id));
      const skipped = caregiverIds.length - newIds.length;

      if (newIds.length === 0) {
        toast({
          title: "Already assigned",
          description: `All selected caregiver(s) already have this course.`,
        });
        return { ok: true, assignmentIds: [], skipped };
      }

      const inserts = newIds.map((cid) => ({
        user_id: user.id,
        course_id: courseId,
        caregiver_id: cid,
        due_date: dueDate || null,
        assigned_by: user.email || "Admin",
      }));
      const { data, error } = await supabase.from("lms_assignments").insert(inserts as any).select("id");
      if (error) throw error;
      toast({
        title: `Course assigned to ${newIds.length} caregiver(s)`,
        description: skipped > 0 ? `${skipped} skipped (already assigned).` : undefined,
      });
      fetchAssignments();
      return { ok: true, assignmentIds: (data || []).map((r: any) => r.id), skipped };
    } catch (error: any) {
      toast({ title: "Error assigning course", description: error.message, variant: "destructive" });
      return { ok: false, assignmentIds: [], skipped: 0 };
    }
  };

  const updateAssignment = async (id: string, updates: Partial<LmsAssignment>) => {
    try {
      const { error } = await supabase.from("lms_assignments").update(updates as any).eq("id", id);
      if (error) throw error;
      fetchAssignments();
    } catch (error: any) {
      toast({ title: "Error updating assignment", description: error.message, variant: "destructive" });
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase.from("lms_assignments").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Assignment removed" });
      fetchAssignments();
    } catch (error: any) {
      toast({ title: "Error removing assignment", description: error.message, variant: "destructive" });
    }
  };

  return { assignments, loading, assignCourse, updateAssignment, deleteAssignment, refetch: fetchAssignments };
}

