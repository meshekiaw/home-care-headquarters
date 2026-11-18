// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuizResetSection from "./QuizResetSection";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn(), invalidate: vi.fn(), status: [] as unknown[], history: { attempts: [] as unknown[], resets: [] as unknown[] } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/useQuizResetStatus", () => ({ useQuizResetStatus: () => ({ data: mocks.status, isLoading: false, isError: false, refetch: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.history, isLoading: false, isError: false, refetch: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
const session = { assignment_id: "test-assignment", caregiver_id: "test-caregiver-id", course_id: "c", session_number: 3, session_title: "Infection Control & Hand Hygiene", assignment_status: "in_progress", max_attempts: 2, total_attempts: 2, attempts_since_reset: 2, failed_since_reset: 2, last_reset_at: null, needs_reset: true };
const attempt = (n: number, at: string) => ({ id: `a${n}`, assignment_id: "test-assignment", attempt_number: n, score: 50, passing_score: 70, passed: false, attempted_at: at });
beforeEach(() => { vi.clearAllMocks(); mocks.status = [session]; mocks.history = { attempts: [attempt(1, "2026-11-01T10:00:00Z"), attempt(2, "2026-11-02T10:00:00Z")], resets: [] }; mocks.rpc.mockResolvedValue({ data: {}, error: null }); });
afterEach(cleanup);

describe("Reset quiz on the In-Service tab (synthetic Test Caregiver only)", () => {
  it("shows failed attempts and resets only after the exact confirmation", async () => {
    render(<QuizResetSection caregiverId="test-caregiver-id" caregiverName="Test Caregiver" />);
    expect(screen.getByText("2", { selector: "strong" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset quiz" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.getByText("Reset the Infection Control & Hand Hygiene quiz for Test Caregiver? She’ll be able to take it again. Her video progress stays.")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Reset quiz" }).at(-1)!);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("reset_training_quiz", { p_assignment_id: "test-assignment" }));
  });
  it("offers no reset button when the session is not locked", () => {
    mocks.status = [{ ...session, needs_reset: false, failed_since_reset: 1, attempts_since_reset: 1 }];
    render(<QuizResetSection caregiverId="test-caregiver-id" caregiverName="Test Caregiver" />);
    expect(screen.queryByRole("button", { name: "Reset quiz" })).toBeNull();
  });
  it("marks earlier attempts as before the reset and lists the log", () => {
    mocks.status = [{ ...session, needs_reset: false, failed_since_reset: 0, attempts_since_reset: 0, last_reset_at: "2026-11-03T10:00:00Z" }];
    mocks.history = { attempts: [attempt(1, "2026-11-01T10:00:00Z"), attempt(2, "2026-11-02T10:00:00Z"), attempt(3, "2026-11-04T10:00:00Z")], resets: [{ id: "r1", assignment_id: "test-assignment", caregiver_id: "test-caregiver-id", course_id: "c", reset_by_name: "Office Admin", attempts_before: 2, failed_attempts_before: 2, created_at: "2026-11-03T10:00:00Z" }] };
    render(<QuizResetSection caregiverId="test-caregiver-id" caregiverName="Test Caregiver" />);
    expect(screen.getAllByText("Before reset", { selector: "div" })).toHaveLength(2);
    expect(screen.getByText(/Office Admin reset the Infection Control & Hand Hygiene quiz for Test Caregiver/)).toBeTruthy();
  });
});
