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
  ): Promise<{ ok: boolean; assignmentIds: string[] }> => {
    if (!user) return { ok: false, assignmentIds: [] };
    try {
      const inserts = caregiverIds.map((cid) => ({
        user_id: user.id,
        course_id: courseId,
        caregiver_id: cid,
        due_date: dueDate || null,
        assigned_by: user.email || "Admin",
      }));
      const { data, error } = await supabase.from("lms_assignments").insert(inserts as any).select("id");
      if (error) throw error;
      toast({ title: `Course assigned to ${caregiverIds.length} caregiver(s)` });
      fetchAssignments();
      return { ok: true, assignmentIds: (data || []).map((r: any) => r.id) };
    } catch (error: any) {
      toast({ title: "Error assigning course", description: error.message, variant: "destructive" });
      return { ok: false, assignmentIds: [] };
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

  return { assignments, loading, assignCourse, updateAssignment, refetch: fetchAssignments };
}
