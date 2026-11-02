import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, Pause, Play, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createResumeTransport, playbackTime, resumePosition, SEEK_TOLERANCE, VIDEO_GATE_PERCENT, VIDEO_SAVE_INTERVAL_MS } from "@/utils/trainingResume";
export { VIDEO_GATE_PERCENT } from "@/utils/trainingResume";

let apiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if ((window as any).YT?.Player) return Promise.resolve((window as any).YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const previous = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      resolve((window as any).YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

interface Props {
  videoId: string;
  assignmentId: string;
  courseId: string;
  caregiverId: string;
  userId: string;
  onProgress: (percent: number, unlocked: boolean) => void;
}

export default function GatedVideoPlayer({ videoId, assignmentId, onProgress }: Props) {
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const reportRef = useRef(onProgress);
  reportRef.current = onProgress;
  const [percent, setPercent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [welcome, setWelcome] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const restartRef = useRef<(() => void) | null>(null);

  const report = useCallback((value: number) => {
    setPercent(value);
    reportRef.current(value, value >= VIDEO_GATE_PERCENT);
  }, []);

  useEffect(() => {
    let destroyed = false;
    let player: any;
    let interval: number | undefined;
    let watched = 0, position = 0, duration = 0;
    let lastSave = Date.now();
    let pending = false;
    let lastTick = performance.now();
    let lastTime = 0;
    const transport = createResumeTransport();
    setStatus("loading"); setLoadError(false); setPlayerReady(false); setWelcome(null); setPlaying(false);
    report(0);

    // Each payload captures its own timestamp; older device requests cannot
    // rewind a newer saved position or reduce previously earned watch credit.
    const save = async () => {
      if (!duration) return;
      const snapshot = {
        p_assignment_id: assignmentId,
        p_position: Math.min(position, duration, watched),
        p_watched: Math.min(watched, duration), p_duration: duration,
        p_recorded_at: new Date().toISOString(),
      };
      if (!destroyed) setStatus("saving");
      lastSave = Date.now();
      try {
        const stored = await transport.rpc<{ percent_complete: number }>("save_training_video_progress", snapshot);
        pending = false;
        if (!destroyed) { setStatus("saved"); report(stored.percent_complete); }
      } catch {
        pending = true;
        if (!destroyed) setStatus("error");
      }
    };
    saveRef.current = save;

    const sample = () => {
      if (!player?.getCurrentTime) return;
      const now = performance.now();
      const elapsed = Math.min(2, Math.max(0, (now - lastTick) / 1000));
      lastTick = now;
      duration = player.getDuration?.() || duration;
      const t = Math.max(0, Math.min(player.getCurrentTime(), duration || Infinity));
      if (player.getPlaybackRate?.() > 1) player.setPlaybackRate(1);
      // Reject forward jumps; a reported end alone is never watch credit.
      if (t > watched + SEEK_TOLERANCE || (t > watched && t - lastTime > elapsed + SEEK_TOLERANCE)) {
        player.seekTo(watched, true); position = watched; lastTime = watched; return;
      }
      position = t;
      if (player.getPlayerState?.() === 1 && t > watched) watched = t;
      lastTime = t;
    };
    const onHide = () => { sample(); void save(); };
    const onOnline = () => { if (pending) void save(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    window.addEventListener("online", onOnline);

    const init = async () => {
      try {
        const { data, error } = await supabase.from("lms_video_progress")
          .select("watched_seconds,duration_seconds,last_position_seconds,percent_complete")
          .eq("assignment_id", assignmentId).maybeSingle();
        if (error) throw error;
        if (destroyed) return;
        watched = Number(data?.watched_seconds) || 0;
        duration = Number(data?.duration_seconds) || 0;
        position = resumePosition(Number(data?.last_position_seconds) || 0, watched, duration);
        lastTime = position;
        report(data?.percent_complete ?? 0);
        setStatus("saved");
        if (position > 0) setWelcome(position);
        const YT = await loadYouTubeApi();
        if (destroyed || !holderRef.current) return;
        // YouTube replaces its target; a child leaves React's holder intact.
        const target = document.createElement("div");
        holderRef.current.replaceChildren(target);
        player = new YT.Player(target, {
          videoId,
          playerVars: { controls: 0, disablekb: 1, rel: 0, iv_load_policy: 3, fs: 0, playsinline: 1, origin: window.location.origin },
          events: {
            onReady: (e: any) => {
              if (destroyed) return;
              duration = e.target.getDuration() || duration;
              position = resumePosition(position, watched, duration);
              lastTime = position; lastTick = performance.now();
              if (position > 0) e.target.seekTo(position, true);
              setPlayerReady(true);
            },
            onPlaybackRateChange: (e: any) => { if (e.target.getPlaybackRate() > 1) e.target.setPlaybackRate(1); },
            onStateChange: (e: any) => {
              if (destroyed) return;
              sample(); setPlaying(e.data === 1);
              if (e.data === 0 && duration - watched <= SEEK_TOLERANCE) { watched = duration; position = duration; }
              if (e.data === 2 || e.data === 0) void save();
              lastTick = performance.now(); lastTime = position;
            },
            onError: () => { if (!destroyed) setLoadError(true); },
          },
        });
        playerRef.current = player;
        restartRef.current = () => {
          player.pauseVideo(); player.seekTo(0, true); position = 0; lastTime = 0;
          setWelcome(null); void save();
        };
        interval = window.setInterval(() => {
          sample();
          if ((player.getPlayerState?.() === 1 || pending) && Date.now() - lastSave >= VIDEO_SAVE_INTERVAL_MS) void save();
        }, 500);
      } catch { if (!destroyed) { setLoadError(true); setStatus("error"); } }
    };
    void init();
    return () => {
      sample(); void save(); destroyed = true;
      if (interval) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide); window.removeEventListener("beforeunload", onHide);
      window.removeEventListener("online", onOnline);
      try { player?.destroy?.(); } catch { /* already destroyed */ }
      playerRef.current = null; transport.dispose();
    };
  }, [assignmentId, videoId, report, retry]);

  const unlocked = percent >= VIDEO_GATE_PERCENT;
  return (
    <div className="mb-6 space-y-3">
      {welcome !== null && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border bg-muted/50 p-3">
          <p className="text-sm" role="status">Welcome back — picking up at {playbackTime(welcome)}</p>
          <Button variant="outline" size="sm" disabled={!playerReady} onClick={() => restartRef.current?.()}>
            <RotateCcw className="w-4 h-4 mr-2" />Start from the beginning
          </Button>
        </div>
      )}
      <div className="w-full rounded-lg overflow-hidden border bg-foreground aspect-video [&_iframe]:w-full [&_iframe]:h-full">
        <div ref={holderRef} className="w-full h-full" />
      </div>
      {loadError ? (
        <div className="flex items-center gap-3 text-sm text-destructive" role="alert">
          Couldn't load your video or saved place.
          <Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>Retry</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" disabled={!playerReady} loading={status === "loading"} onClick={() => {
            if (playing) playerRef.current?.pauseVideo(); else playerRef.current?.playVideo();
          }}>
            {playing ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {playing ? "Pause" : "Play"}
          </Button>
          <span role="status" className={`text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {status === "saving" ? "Saving your place…" : status === "error" ? "Your place hasn't saved yet. Reconnect to save." : status === "loading" ? "Loading your saved place…" : "Your place is saved"}
          </span>
          {status === "error" && !loadError && <Button variant="outline" size="sm" onClick={() => void saveRef.current?.()}>Retry save</Button>}
        </div>
      )}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 font-medium">
            {unlocked ? <><CheckCircle2 className="w-4 h-4 text-success" />Video watched</> : <><Lock className="w-4 h-4 text-muted-foreground" />Watch the full video to unlock the quiz</>}
          </span>
          <span className="text-muted-foreground">{percent}% watched</span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>
    </div>
  );
}
