// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CaregiverPasswordControl from "./CaregiverPasswordControl";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

const password = "unit-test-password";
function openForm() {
  render(<CaregiverPasswordControl caregiverId="test-caregiver-record" caregiverName="Test Caregiver" />);
  fireEvent.click(screen.getByRole("button", { name: "Set temporary password" }));
}
function fillForm(confirmation = password) {
  fireEvent.change(screen.getByLabelText("Temporary password", { exact: true }), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm temporary password"), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole("checkbox"));
}
function submit() { fireEvent.click(screen.getAllByRole("button", { name: "Set temporary password" }).at(-1) as HTMLElement); }

beforeEach(() => { vi.clearAllMocks(); mocks.invoke.mockResolvedValue({ data: { success: true }, error: null }); });
afterEach(cleanup);

describe("caregiver password form with no live account or session", () => {
  it("does not contact any account service merely by opening or cancelling", () => {
    openForm(); fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("requires matching confirmation before issuing a reset", () => {
    openForm(); fillForm("different-password"); submit();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("sends the caregiver record ID and password, without email or a client-chosen user ID", async () => {
    openForm(); fillForm(); submit();
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith("caregiver-login-password", {
      body: { caregiver_id: "test-caregiver-record", password },
    }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });
  it("clears both passwords and confirmation after cancelling and reopening", () => {
    openForm(); fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Set temporary password" }));
    expect((screen.getByLabelText("Temporary password", { exact: true }) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Confirm temporary password") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("does not automatically retry a rejected reset", async () => {
    mocks.invoke.mockResolvedValue({ data: { error: "Password was not changed." }, error: null });
    openForm(); fillForm(); submit();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledTimes(1));
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });
});