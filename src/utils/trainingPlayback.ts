export const TRAINING_PLAYBACK_ACTIVITY_EVENT = "training-video-activity";
export const TRAINING_ACTIVITY_INTERVAL_MS = 10_000;
export const YOUTUBE_EMBED_HOST = "https://www.youtube-nocookie.com";

interface ScreenLock {
  released: boolean;
  release: () => Promise<void>;
}

// Protection belongs to actual visible playback, not the route or watch credit.
// A delayed wake-lock request must never keep a paused/left page awake.
export function createTrainingPlaybackProtection(isPlaying: () => boolean) {
  let active = false;
  let generation = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let lock: ScreenLock | undefined;

  const heartbeat = () => {
    if (active && document.visibilityState === "visible" && isPlaying()) {
      window.dispatchEvent(new Event(TRAINING_PLAYBACK_ACTIVITY_EVENT));
    }
  };
  const stop = () => {
    active = false;
    generation++;
    clearInterval(timer);
    timer = undefined;
    const previous = lock;
    lock = undefined;
    if (previous && !previous.released) void previous.release().catch(() => {});
  };
  const start = () => {
    if (active || document.visibilityState !== "visible" || !isPlaying()) return;
    active = true;
    const requestGeneration = ++generation;
    heartbeat();
    timer = setInterval(heartbeat, TRAINING_ACTIVITY_INTERVAL_MS);
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<ScreenLock> };
    }).wakeLock;
    if (wakeLock) {
      void wakeLock.request("screen").then(sentinel => {
        if (!active || generation !== requestGeneration || document.visibilityState !== "visible" || !isPlaying()) {
          void sentinel.release().catch(() => {});
        } else {
          lock = sentinel;
        }
      }).catch(() => { /* Unsupported/power-policy refusal must not stop training. */ });
    }
  };
  return { start, stop };
}