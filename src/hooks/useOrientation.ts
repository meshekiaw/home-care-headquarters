import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface OrientationModule {
  id: string;
  user_id: string;
  section_number: number;
  title: string;
  content: string;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrientationProgress {
  id: string;
  user_id: string;
  caregiver_id: string;
  current_section: number;
  sections_completed: number[];
  quiz_scores: Record<string, number>;
  completed_at: string | null;
  confirmed_at: string | null;
  signature_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrientationQuiz {
  id: string;
  user_id: string;
  section_number: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  points: number;
  sort_order: number;
}

export function useOrientationModules() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [modules, setModules] = useState<OrientationModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orientation_modules")
        .select("*")
        .order("section_number", { ascending: true });
      if (error) throw error;
      setModules((data as any[]) || []);
    } catch (error: any) {
      toast({ title: "Error loading orientation modules", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const addModule = async (module: Partial<OrientationModule>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("orientation_modules").insert({ ...module, user_id: user.id } as any);
      if (error) throw error;
      toast({ title: "Section added" });
      fetchModules();
    } catch (error: any) {
      toast({ title: "Error adding section", description: error.message, variant: "destructive" });
    }
  };

  const updateModule = async (id: string, updates: Partial<OrientationModule>) => {
    try {
      const { error } = await supabase.from("orientation_modules").update(updates as any).eq("id", id);
      if (error) throw error;
      toast({ title: "Section updated" });
      fetchModules();
    } catch (error: any) {
      toast({ title: "Error updating section", description: error.message, variant: "destructive" });
    }
  };

  const deleteModule = async (id: string) => {
    try {
      const { error } = await supabase.from("orientation_modules").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Section deleted" });
      fetchModules();
    } catch (error: any) {
      toast({ title: "Error deleting section", description: error.message, variant: "destructive" });
    }
  };

  const seedModules = async (sections: Array<{ sectionNumber: number; title: string; content: string }>) => {
    if (!user) return;
    try {
      const inserts = sections.map((s) => ({
        user_id: user.id,
        section_number: s.sectionNumber,
        title: s.title,
        content: s.content,
      }));
      const { error } = await supabase.from("orientation_modules").insert(inserts as any);
      if (error) throw error;
      toast({ title: "Orientation content loaded successfully" });
      fetchModules();
    } catch (error: any) {
      toast({ title: "Error seeding modules", description: error.message, variant: "destructive" });
    }
  };

  return { modules, loading, addModule, updateModule, deleteModule, seedModules, refetch: fetchModules };
}

export function useOrientationQuizzes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<OrientationQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orientation_quizzes")
        .select("*")
        .order("section_number", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setQuizzes((data as any[])?.map((q: any) => ({ ...q, options: q.options || [] })) || []);
    } catch (error: any) {
      toast({ title: "Error loading quizzes", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const seedQuizzes = async (questions: Array<{ sectionNumber: number; questionText: string; options: string[]; correctAnswer: string; points: number }>) => {
    if (!user) return;
    try {
      const inserts = questions.map((q, i) => ({
        user_id: user.id,
        section_number: q.sectionNumber,
        question_text: q.questionText,
        options: q.options,
        correct_answer: q.correctAnswer,
        points: q.points,
        sort_order: i,
      }));
      const { error } = await supabase.from("orientation_quizzes").insert(inserts as any);
      if (error) throw error;
      toast({ title: "Quiz questions loaded successfully" });
      fetchQuizzes();
    } catch (error: any) {
      toast({ title: "Error seeding quizzes", description: error.message, variant: "destructive" });
    }
  };

  const addQuiz = async (quiz: Partial<OrientationQuiz>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("orientation_quizzes").insert({ ...quiz, user_id: user.id } as any);
      if (error) throw error;
      toast({ title: "Question added" });
      fetchQuizzes();
    } catch (error: any) {
      toast({ title: "Error adding question", description: error.message, variant: "destructive" });
    }
  };

  const deleteQuiz = async (id: string) => {
    try {
      const { error } = await supabase.from("orientation_quizzes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Question deleted" });
      fetchQuizzes();
    } catch (error: any) {
      toast({ title: "Error deleting question", description: error.message, variant: "destructive" });
    }
  };

  return { quizzes, loading, seedQuizzes, addQuiz, deleteQuiz, refetch: fetchQuizzes };
}

export function useOrientationProgress() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [progressList, setProgressList] = useState<(OrientationProgress & { caregiver?: { first_name: string; last_name: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orientation_progress")
        .select("*, caregivers(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProgressList(
        (data as any[])?.map((p: any) => ({
          ...p,
          sections_completed: p.sections_completed || [],
          quiz_scores: p.quiz_scores || {},
          caregiver: p.caregivers,
        })) || []
      );
    } catch (error: any) {
      toast({ title: "Error loading progress", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const upsertProgress = async (caregiverId: string, updates: Partial<OrientationProgress>) => {
    if (!user) return;
    const existing = progressList.find((p) => p.caregiver_id === caregiverId);
    try {
      if (existing) {
        const { error } = await supabase.from("orientation_progress").update(updates as any).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("orientation_progress").insert({
          user_id: user.id,
          caregiver_id: caregiverId,
          ...updates,
        } as any);
        if (error) throw error;
      }
      fetchProgress();
    } catch (error: any) {
      toast({ title: "Error saving progress", description: error.message, variant: "destructive" });
    }
  };

  return { progressList, loading, upsertProgress, refetch: fetchProgress };
}
