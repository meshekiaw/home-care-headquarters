import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Watched share of the video required before the quiz unlocks.
export const VIDEO_GATE_PERCENT = 95;
const SEEK_TOLERANCE = 1.5; // seconds of drift allowed before we pull playback back
const SAVE_INTERVAL_MS = 5000;

let apiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if ((window as any).YT?.Player) return Promise.resolve((window as any).YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve((window as any).YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromise;
}

interface Props {
  videoId: string;
  assignmentId: string;
  courseId: string;
  caregiverId: string;
  userId: string;
  /** Called whenever watched progress changes so the page can gate the quiz. */
  onProgress: (percent: number, unlocked: boolean) => void;
}

export default function GatedVideoPlayer({
  videoId,
  assignmentId,
  courseId,
  caregiverId,
  userId,
  onProgress,
}: Props) {
  const { toast } = useToast();
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const watchedRef = useRef(0); // furthest point legitimately reached
  const durationRef = useRef(0);
  const positionRef = useRef(0);
  const savedRef = useRef(0);
  const completedRef = useRef(false);
  const resumeRef = useRef(0);
  const [percent, setPercent] = useState(0);
  const [ready, setReady] = useState(false);

  const report = useCallback(
    (p: number) => {
      setPercent(p);
      onProgress(p, p >= VIDEO_GATE_PERCENT);
    },
    [onProgress]
  );

  const save = useCallback(
    async (force = false) => {
      const watched = watchedRef.current;
      const duration = durationRef.current;
      if (!duration) return;
      if (!force && Math.abs(watched - savedRef.current) < 3) return;
      savedRef.current = watched;
      const pct = Math.min(100, Math.round((watched / duration) * 100));
      const nowComplete = pct >= VIDEO_GATE_PERCENT;
      await supabase.from("lms_video_progress").upsert(
        {
          user_id: userId,
          assignment_id: assignmentId,
          course_id: courseId,
          caregiver_id: caregiverId,
          watched_seconds: Math.round(watched),
          duration_seconds: Math.round(duration),
          percent_complete: pct,
          last_position_seconds: Math.round(positionRef.current),
          ...(nowComplete && !completedRef.current
            ? { video_completed_at: new Date().toISOString() }
            : {}),
        },
        { onConflict: "assignment_id" }
      );
      if (nowComplete) completedRef.current = true;
    },
    [assignmentId, courseId, caregiverId, userId]
  );

  // Load any stored progress first so playback resumes where they stopped.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("lms_video_progress")
        .select("watched_seconds, duration_seconds, percent_complete, last_position_seconds, video_completed_at")
        .eq("assignment_id", assignmentId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        watchedRef.current = Number(data.watched_seconds) || 0;
        durationRef.current = Number(data.duration_seconds) || 0;
        resumeRef.current = Number(data.last_position_seconds) || 0;
        completedRef.current = !!data.video_completed_at;
        report(data.percent_complete ?? 0);
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [assignmentId, report]);

  useEffect(() => {
    if (!ready || !holderRef.current) return;
    let interval: number | undefined;
    let destroyed = false;

    loadYouTubeApi().then((YT) => {
      if (destroyed || !holderRef.current) return;
      playerRef.current = new YT.Player(holderRef.current, {
        videoId,
        playerVars: {
          controls: 0, // no progress bar, so it cannot be dragged
          disablekb: 1, // no keyboard jumping
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            durationRef.current = e.target.getDuration() || durationRef.current;
            if (resumeRef.current > 1) e.target.seekTo(resumeRef.current, true);
          },
          onPlaybackRateChange: (e: any) => {
            if (e.target.getPlaybackRate() > 1) {
              e.target.setPlaybackRate(1);
              toast({
                title: "Normal speed required",
                description: "Training videos must play at normal speed.",
                variant: "destructive",
              });
            }
          },
          onStateChange: (e: any) => {
            if (e.data === 0) {
              // Ended: credit the full duration.
              watchedRef.current = durationRef.current;
              positionRef.current = durationRef.current;
              report(100);
              save(true);
            }
            if (e.data === 2) save(true); // paused
          },
        },
      });

      interval = window.setInterval(() => {
        const p = playerRef.current;
        if (!p?.getCurrentTime) return;
        const duration = p.getDuration?.() || durationRef.current;
        if (duration) durationRef.current = duration;
        const t = p.getCurrentTime();
        positionRef.current = t;
        if (t > watchedRef.current + SEEK_TOLERANCE) {
          // Forward skip attempt: pull back to the furthest watched point.
          p.seekTo(watchedRef.current, true);
          return;
        }
        if (t > watchedRef.current) watchedRef.current = t;
        if (p.getPlaybackRate?.() > 1) p.setPlaybackRate(1);
        if (durationRef.current) {
          report(Math.min(100, Math.round((watchedRef.current / durationRef.current) * 100)));
        }
        save();
      }, 1000);
    });

    const onHide = () => { save(true); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      destroyed = true;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      if (interval) window.clearInterval(interval);
      save(true);
      try { playerRef.current?.destroy?.(); } catch { /* player already gone */ }
    };
  }, [ready, videoId, report, save, toast]);

  const unlocked = percent >= VIDEO_GATE_PERCENT;

  return (
    <div className="mb-6 space-y-3">
      <div className="w-full rounded-lg overflow-hidden border bg-black aspect-video">
        <div ref={holderRef} className="w-full h-full" />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            {unlocked ? (
              <><CheckCircle2 className="w-4 h-4 text-success" /> Video watched</>
            ) : (
              <><Lock className="w-4 h-4 text-muted-foreground" /> Watch the full video to unlock the quiz</>
            )}
          </span>
          <span className="text-muted-foreground">{percent}% watched</span>
        </div>
        <Progress value={percent} className="h-2" />
        {!unlocked && (
          <p className="text-xs text-muted-foreground">
            You can pause or rewind at any time, but skipping ahead is not allowed. The quiz opens at{" "}
            {VIDEO_GATE_PERCENT}% watched.
          </p>
        )}
      </div>
    </div>
  );
}
