// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrainingPlaybackProtection, TRAINING_PLAYBACK_ACTIVITY_EVENT } from "./trainingPlayback";

let visible = "visible", playing = true;
let protection: ReturnType<typeof createTrainingPlaybackProtection>;
let activity: ReturnType<typeof vi.fn>, release: ReturnType<typeof vi.fn>, request: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers(); visible = "visible"; playing = true;
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visible });
  release = vi.fn().mockResolvedValue(undefined);
  request = vi.fn().mockResolvedValue({ released: false, release });
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
  activity = vi.fn(); window.addEventListener(TRAINING_PLAYBACK_ACTIVITY_EVENT, activity);
  protection = createTrainingPlaybackProtection(() => playing);
});
afterEach(() => { protection.stop(); window.removeEventListener(TRAINING_PLAYBACK_ACTIVITY_EVENT, activity); vi.useRealTimers(); });
describe("visible training playback protection", () => {
  it("requests a screen wake lock and sends activity throughout a playing video", async () => {
    protection.start(); await Promise.resolve(); expect(request).toHaveBeenCalledExactlyOnceWith("screen");
    vi.advanceTimersByTime(16 * 60 * 1000); expect(activity).toHaveBeenCalledTimes(97);
  });
  it("releases on pause/end/leave and requires a new Play to request again", async () => {
    protection.start(); await Promise.resolve(); playing = false; protection.stop();
    expect(release).toHaveBeenCalledTimes(1);
    const calls = activity.mock.calls.length;
    vi.advanceTimersByTime(60_000); expect(activity).toHaveBeenCalledTimes(calls);
    protection.start(); expect(request).toHaveBeenCalledTimes(1);
    playing = true; protection.start(); await Promise.resolve(); expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not treat background playback as activity or request a hidden-screen lock", () => {
    visible = "hidden"; protection.start(); vi.advanceTimersByTime(60_000);
    expect(activity).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });
  it("does not credit a stopped or hidden player before its stop callback", () => {
    protection.start(); playing = false; vi.advanceTimersByTime(10_000);
    playing = true; visible = "hidden"; vi.advanceTimersByTime(10_000); expect(activity).toHaveBeenCalledTimes(1);
  });
  it("releases a wake lock that resolves after leaving rather than leaking it", async () => {
    let resolve: ((value: { released: boolean; release: typeof release }) => void) | undefined;
    request.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    protection.start(); protection.stop(); resolve?.({ released: false, release });
    await Promise.resolve(); expect(release).toHaveBeenCalledTimes(1);
  });
  it("continues activity when the phone refuses or lacks wake lock support", async () => {
    request.mockRejectedValueOnce(new Error("Power policy")); protection.start();
    await Promise.resolve(); await Promise.resolve(); vi.advanceTimersByTime(10_000); expect(activity).toHaveBeenCalledTimes(2);
    protection.stop(); Object.defineProperty(navigator, "wakeLock", { configurable: true, value: undefined });
    protection.start(); vi.advanceTimersByTime(10_000); expect(activity).toHaveBeenCalledTimes(4);
  });
});