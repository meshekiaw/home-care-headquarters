// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import GatedVideoPlayer from "./GatedVideoPlayer";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), dispose: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/utils/trainingResume", async (original) => ({
  ...await original<typeof import("@/utils/trainingResume")>(),
  createResumeTransport: () => ({ rpc: mocks.rpc, dispose: mocks.dispose }),
}));
let visible = "visible", state = 2, time = 12;
let config: any, player: any;
let release: ReturnType<typeof vi.fn>, request: ReturnType<typeof vi.fn>;
beforeEach(() => {
  visible = "visible"; state = 2; time = 12; player = undefined; vi.clearAllMocks();
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visible });
  release = vi.fn().mockResolvedValue(undefined); request = vi.fn().mockResolvedValue({ released: false, release });
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
  mocks.rpc.mockResolvedValue({ percent_complete: 12 });
  mocks.from.mockImplementation(() => {
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { watched_seconds: 12, last_position_seconds: 12, duration_seconds: 100, percent_complete: 12 }, error: null }) }; return q;
  });
  (window as any).YT = { Player: class {
    constructor(_target: unknown, options: any) { config = options; player = this; queueMicrotask(() => options.events.onReady({ target: this })); }
    getDuration() { return 100; } getCurrentTime() { return time; } getPlayerState() { return state; }
    getPlaybackRate() { return 1; } seekTo(t: number) { time = t; }
    pauseVideo = vi.fn(() => { state = 2; config.events.onStateChange({ data: 2, target: this }); });
    destroy = vi.fn();
  } };
});
afterEach(() => { cleanup(); delete (window as any).YT; });
async function open() {
  const view = render(<GatedVideoPlayer videoId="test-video" assignmentId="test-assignment" courseId="test-course" caregiverId="test-caregiver" userId="test-user" onProgress={() => {}} />);
  await waitFor(() => expect(player).toBeDefined()); await act(async () => {}); return view;
}
async function play() { await act(async () => { state = 1; config.events.onStateChange({ data: 1, target: player }); }); }
describe("training player lifecycle without changing watch credit", () => {
  it("uses YouTube's privacy-enhanced host and same-channel related-video setting", async () => {
    await open(); expect(config.host).toBe("https://www.youtube-nocookie.com"); expect(config.playerVars.rel).toBe(0);
  });
  it("samples/saves before pausing on app switch and requires Play again on return", async () => {
    await open(); await play(); mocks.rpc.mockClear();
    await act(async () => { visible = "hidden"; document.dispatchEvent(new Event("visibilitychange")); });
    expect(player.pauseVideo).toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("save_training_video_progress", expect.objectContaining({ p_position: 12, p_watched: 12, p_duration: 100 }));
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(player.pauseVideo.mock.invocationCallOrder[0]);
    expect(release).toHaveBeenCalledTimes(1);
    await act(async () => { visible = "visible"; document.dispatchEvent(new Event("visibilitychange")); });
    expect(state).toBe(2); expect(request).toHaveBeenCalledTimes(1);
    await play(); expect(request).toHaveBeenCalledTimes(2);
  });
  it("saves and releases protection when navigating away", async () => {
    const view = await open(); await play(); mocks.rpc.mockClear(); await act(async () => view.unmount());
    expect(mocks.rpc).toHaveBeenCalledWith("save_training_video_progress", expect.objectContaining({ p_position: 12 }));
    expect(release).toHaveBeenCalledTimes(1); expect(player.destroy).toHaveBeenCalledTimes(1);
  });
  it("releases wake lock on pause and end without awarding unearned video credit", async () => {
    await open(); await play();
    await act(async () => { state = 2; config.events.onStateChange({ data: 2, target: player }); }); expect(release).toHaveBeenCalledTimes(1);
    await play();
    await act(async () => { state = 0; config.events.onStateChange({ data: 0, target: player }); }); expect(release).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenLastCalledWith("save_training_video_progress", expect.objectContaining({ p_watched: 12, p_position: 12 }));
  });
});