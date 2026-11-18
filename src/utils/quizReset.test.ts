import { describe, expect, it } from "vitest";
import { caregiversNeedingReset, isBeforeReset, resetConfirmText } from "./quizReset";

describe("quiz reset rules", () => {
  const resets = [{ assignment_id: "a1", created_at: "2026-11-10T12:00:00Z" }];
  it("marks attempts up to the reset as before reset, later ones not", () => {
    expect(isBeforeReset({ assignment_id: "a1", attempted_at: "2026-11-09T12:00:00Z" }, resets)).toBe(true);
    expect(isBeforeReset({ assignment_id: "a1", attempted_at: "2026-11-11T12:00:00Z" }, resets)).toBe(false);
    expect(isBeforeReset({ assignment_id: "a2", attempted_at: "2026-11-09T12:00:00Z" }, resets)).toBe(false);
  });
  it("counts each caregiver once however many sessions need a reset", () => {
    expect(caregiversNeedingReset([{ caregiver_id: "c1", needs_reset: true }, { caregiver_id: "c1", needs_reset: true }, { caregiver_id: "c2", needs_reset: false }]).size).toBe(1);
  });
  it("uses the requested confirmation wording", () => {
    expect(resetConfirmText("Infection Control", "Test Caregiver")).toBe("Reset the Infection Control quiz for Test Caregiver? She’ll be able to take it again. Her video progress stays.");
  });
});
