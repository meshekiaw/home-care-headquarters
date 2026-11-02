// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CaregiverSignInAccess from "./CaregiverSignInAccess";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn(), refetch: vi.fn(), invalidate: vi.fn(), data: [] as unknown[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/useCaregiverSignInAccess", () => ({ useCaregiverSignInAccess: () => ({ data: mocks.data, refetch: mocks.refetch, isLoading: false, isFetching: false, isError: false }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
const access = { caregiver_id: "test-caregiver-id", caregiver_name: "Test Caregiver", email: "test-caregiver@example.invalid", account_email: null, state: "no_account", problem: null, history: [] };
const props = { isAdmin: true, caregiverId: access.caregiver_id, profileEmail: access.email, profileName: access.caregiver_name, onSaved: vi.fn() };
beforeEach(() => { vi.clearAllMocks(); mocks.data = [access]; mocks.invoke.mockResolvedValue({ data: { success: true }, error: null }); });
afterEach(cleanup);
describe("admin access confirmation (no live accounts or sign-in)", () => {
  it("makes no change on opening or cancelling confirmation", () => {
    render(<CaregiverSignInAccess {...props} />); fireEvent.click(screen.getByRole("button", { name: "Give caregiver access" }));
    expect(mocks.invoke).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("submits only after confirmation and sends the displayed caregiver identity", async () => {
    render(<CaregiverSignInAccess {...props} />); fireEvent.click(screen.getByRole("button", { name: "Give caregiver access" })); fireEvent.click(screen.getByRole("button", { name: "Confirm access" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith("caregiver-sign-in-access", { body: { caregiver_id: access.caregiver_id, confirmed_email: access.email, confirmed_name: access.caregiver_name, confirmed: true } }));
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
  });
  it("exposes no change controls to non-admins", () => { render(<CaregiverSignInAccess {...props} isAdmin={false} />); expect(screen.queryByRole("button")).toBeNull(); expect(mocks.invoke).not.toHaveBeenCalled(); });
  it("disables giving access when email is absent", () => {
    mocks.data = [{ ...access, email: "", state: "no_email" }]; render(<CaregiverSignInAccess {...props} profileEmail={null} />);
    expect((screen.getByRole("button", { name: "Give caregiver access" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("disables repair for server-identified nurse/caregiver conflicts", () => {
    mocks.data = [{ ...access, state: "not_set_up", problem: "Nurse account conflict" }]; render(<CaregiverSignInAccess {...props} />);
    expect((screen.getByRole("button", { name: "Fix access" }) as HTMLButtonElement).disabled).toBe(true); expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("does not permit confirmation using stale profile values", () => {
    render(<CaregiverSignInAccess {...props} profileEmail="new-test@example.invalid" />); expect((screen.getByRole("button", { name: "Give caregiver access" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("does not automatically retry rejected changes", async () => {
    mocks.invoke.mockResolvedValue({ data: { error: "Setup was refused." }, error: null }); render(<CaregiverSignInAccess {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Give caregiver access" })); fireEvent.click(screen.getByRole("button", { name: "Confirm access" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledTimes(1)); expect(mocks.invoke).toHaveBeenCalledTimes(1); expect(props.onSaved).not.toHaveBeenCalled();
  });
});