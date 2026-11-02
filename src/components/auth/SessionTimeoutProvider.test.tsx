// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { SessionTimeoutProvider } from "./SessionTimeoutProvider";
import { createTrainingPlaybackProtection } from "@/utils/trainingPlayback";
const mocks = vi.hoisted(() => ({ signOut: vi.fn(), user: { id: "test-caregiver" } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks }));
let visible = "visible";
beforeEach(() => {
  vi.useFakeTimers(); mocks.signOut.mockClear(); visible = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visible });
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: undefined });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("existing inactivity timeout with training-only activity", () => {
  it("still signs out after exactly 15 inactive minutes outside playback", () => {
    render(<SessionTimeoutProvider><p>Test account</p></SessionTimeoutProvider>);
    act(() => vi.advanceTimersByTime(15 * 60 * 1000 - 1)); expect(mocks.signOut).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1)); expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
  it("keeps visible playback signed in past 15 minutes then restores the unchanged idle limit", () => {
    render(<SessionTimeoutProvider><p>Test account</p></SessionTimeoutProvider>);
    const protection = createTrainingPlaybackProtection(() => true);
    act(() => { protection.start(); vi.advanceTimersByTime(20 * 60 * 1000); }); expect(mocks.signOut).not.toHaveBeenCalled();
    protection.stop();
    act(() => vi.advanceTimersByTime(15 * 60 * 1000 - 1)); expect(mocks.signOut).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1)); expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
  it("does not extend a hidden-page session", () => {
    render(<SessionTimeoutProvider><p>Test account</p></SessionTimeoutProvider>);
    const protection = createTrainingPlaybackProtection(() => true); visible = "hidden";
    act(() => { protection.start(); vi.advanceTimersByTime(15 * 60 * 1000); });
    protection.stop(); expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});