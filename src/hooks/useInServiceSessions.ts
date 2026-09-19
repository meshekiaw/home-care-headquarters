import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/friendlyError";
import { resolvePublicOrigin } from "@/lib/publicOrigin";

export interface InServiceSession {
  id: string;
  session_number: number;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  passing_score: number | null;
  is_active: boolean;
  video_url: string | null;
  video_id: string | null;
  question_count: number;
}

/** Extracts a YouTube video id from any common YouTube link format. */
export function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const m = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/
  );
  if (m) return m[1];
  if (/^[\w-]{6,}$/.test(trimmed)) return trimmed; // bare id
  return null;
}

export function sessionShareUrl(sessionNumber: number): string {
  return `${resolvePublicOrigin()}/training/session/${sessionNumber}`;
}

export function useInServiceSessions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<InServiceSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: courses, error } = await supabase
        .from("lms_courses")
        .select("id, session_number, title, description, duration_minutes, passing_score, is_active")
        .not("session_number", "is", null)
        .order("session_number", { ascending: true });
      if (error) throw error;

      const ids = (courses || []).map((c) => c.id);
      const [{ data: videos }, { data: questions }] = await Promise.all([
        supabase.from("lms_session_videos").select("course_id, video_id, video_url").in("course_id", ids),
        supabase.from("lms_quiz_questions").select("course_id").in("course_id", ids),
      ]);

      const videoMap = new Map((videos || []).map((v: any) => [v.course_id, v]));
      const counts = new Map<string, number>();
      for (const q of questions || []) {
        counts.set((q as any).course_id, (counts.get((q as any).course_id) ?? 0) + 1);
      }

      setSessions(
        (courses || []).map((c: any) => ({
          ...c,
          session_number: c.session_number as number,
          video_url: videoMap.get(c.id)?.video_url ?? null,
          video_id: videoMap.get(c.id)?.video_id ?? null,
          question_count: counts.get(c.id) ?? 0,
        }))
      );
    } catch (error: any) {
      toast({ title: "Error loading sessions", description: friendlyError(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const saveSession = async (
    courseId: string,
    updates: {
      title: string;
      description: string | null;
      duration_minutes: number | null;
      passing_score: number;
      videoUrl: string;
    }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("lms_courses")
        .update({
          title: updates.title,
          description: updates.description,
          duration_minutes: updates.duration_minutes,
          passing_score: updates.passing_score,
        })
        .eq("id", courseId);
      if (error) throw error;

      const raw = updates.videoUrl.trim();
      if (!raw) {
        const { error: delErr } = await supabase.from("lms_session_videos").delete().eq("course_id", courseId);
        if (delErr) throw delErr;
      } else {
        const videoId = parseYouTubeId(raw);
        if (!videoId) {
          toast({
            title: "That doesn't look like a YouTube link",
            description: "Paste a link such as https://youtu.be/abc123 or the full watch link.",
            variant: "destructive",
          });
          return false;
        }
        const { error: vErr } = await supabase
          .from("lms_session_videos")
          .upsert(
            { course_id: courseId, provider: "youtube", video_id: videoId, video_url: raw, updated_by: user?.id ?? null },
            { onConflict: "course_id" }
          );
        if (vErr) throw vErr;
      }

      toast({ title: "Session saved" });
      await fetchSessions();
      return true;
    } catch (error: any) {
      toast({ title: "Could not save session", description: friendlyError(error), variant: "destructive" });
      return false;
    }
  };

  return { sessions, loading, saveSession, refetch: fetchSessions };
}
