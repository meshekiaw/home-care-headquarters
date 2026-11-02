import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { firstUnanswered, playbackTime, QuizAnswerQueue, resumePosition, VIDEO_GATE_PERCENT, VIDEO_SAVE_INTERVAL_MS } from "./trainingResume";

describe("training resume rules", () => {
  it("saves video place every 10 seconds", () => expect(VIDEO_SAVE_INTERVAL_MS).toBe(10000));
  it("preserves the existing 95 percent video gate", () => expect(VIDEO_GATE_PERCENT).toBe(95));
  it("resumes the current position instead of the furthest watched point", () => expect(resumePosition(34, 120, 180)).toBe(34));
  it("never resumes beyond watched credit", () => expect(resumePosition(130, 120, 180)).toBe(120));
  it("keeps watched credit when starting from the beginning", () => expect(resumePosition(0, 120, 180)).toBe(0));
  it("formats a saved position accurately", () => expect(playbackTime(754)).toBe("12:34"));
  it("restores the first unanswered question in printed quiz order", () => expect(firstUnanswered([{ id: "a" }, { id: "b" }, { id: "c" }], { a: "yes", c: "no" })).toBe("b"));
  it("all answered drafts resume at Submit", () => expect(firstUnanswered([{ id: "a" }], { a: "yes" })).toBeNull());
  it("sends each selection immediately without grading", async () => {
    const save = vi.fn().mockResolvedValue({}); const queue = new QuizAnswerQueue(save);
    await queue.pick("a", "yes"); expect(save).toHaveBeenCalledExactlyOnceWith("a", "yes"); expect(queue.pending).toBe(0);
  });
  it("serializes changing an answer while its earlier save is pending", async () => {
    let release: (() => void) | undefined;
    const save = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; })).mockResolvedValue({});
    const queue = new QuizAnswerQueue(save);
    const first = queue.pick("a", "old"); const second = queue.pick("a", "new");
    release?.(); await first; await second;
    expect(save.mock.calls).toEqual([["a", "old"], ["a", "new"]]); expect(queue.pending).toBe(0);
  });
  it("retains unsaved answers for reconnection retries", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({}); const queue = new QuizAnswerQueue(save);
    await expect(queue.pick("a", "yes")).rejects.toThrow("offline"); expect(queue.pending).toBe(1);
    await queue.flush(); expect(save).toHaveBeenLastCalledWith("a", "yes"); expect(queue.pending).toBe(0);
  });
});