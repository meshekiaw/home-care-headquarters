// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { CourseVideo } from "./LmsCoursePlayer";
import { TRAINING_PLAYBACK_ACTIVITY_EVENT } from "@/utils/trainingPlayback";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/components/layout/CaregiverLayout", () => ({ default: () => null }));
let visible = "visible";
let request: ReturnType<typeof vi.fn>, release: ReturnType<typeof vi.fn>;
beforeEach(() => {
  visible = "visible"; Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visible });
  release = vi.fn().mockResolvedValue(undefined); request = vi.fn().mockResolvedValue({ released: false, release });
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
});
afterEach(cleanup);
describe("other training video paths retain their completion rules", () => {
  it("counts actual native playback as activity and releases protection on pause/end", async () => {
    const ended = vi.fn(), activity = vi.fn(); window.addEventListener(TRAINING_PLAYBACK_ACTIVITY_EVENT, activity);
    const view = render(<CourseVideo url="https://example.invalid/test.mp4" onEnded={ended} />);
    const video = view.container.querySelector("video"); if (!video) throw new Error("Missing video");
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    await act(async () => fireEvent.play(video));
    expect(request).toHaveBeenCalledWith("screen"); expect(activity).toHaveBeenCalledTimes(1); expect(ended).not.toHaveBeenCalled();
    await act(async () => fireEvent.pause(video)); expect(release).toHaveBeenCalledTimes(1); expect(ended).not.toHaveBeenCalled();
    await act(async () => fireEvent.play(video)); await act(async () => fireEvent.ended(video));
    expect(release).toHaveBeenCalledTimes(2); expect(ended).toHaveBeenCalledTimes(1);
    window.removeEventListener(TRAINING_PLAYBACK_ACTIVITY_EVENT, activity);
  });
  it("pauses native video when switching apps, without completing it or auto-playing on return", async () => {
    const ended = vi.fn(); const view = render(<CourseVideo url="https://example.invalid/test.mp4" onEnded={ended} />);
    const video = view.container.querySelector("video"); if (!video) throw new Error("Missing video");
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    const pause = vi.spyOn(video, "pause").mockImplementation(() => {});
    await act(async () => fireEvent.play(video));
    await act(async () => { visible = "hidden"; document.dispatchEvent(new Event("visibilitychange")); });
    expect(pause).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1); expect(ended).not.toHaveBeenCalled();
    await act(async () => { visible = "visible"; document.dispatchEvent(new Event("visibilitychange")); });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("accepts playback messages only from the embedded YouTube frame and pauses it on leaving", async () => {
    const view = render(<CourseVideo url="https://youtube.com/watch?v=testvideo123" />);
    const frame = view.container.querySelector("iframe"); if (!frame?.contentWindow) throw new Error("Missing video frame");
    const post = vi.spyOn(frame.contentWindow, "postMessage");
    await act(async () => window.dispatchEvent(new MessageEvent("message", { origin: "https://www.youtube-nocookie.com", source: window, data: { event: "onStateChange", info: 1 } })));
    expect(request).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new MessageEvent("message", { origin: "https://www.youtube-nocookie.com", source: frame.contentWindow, data: { event: "onStateChange", info: 1 } })));
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => { visible = "hidden"; document.dispatchEvent(new Event("visibilitychange")); });
    expect(release).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "https://www.youtube-nocookie.com");
  });
});