// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ClientPlanningPanel } from "./ClientPlanningPanel";
import { ClientPlanningFields } from "./ClientPlanningFields";
import ClientIntakeForm from "./ClientIntakeForm";
import ClientNew from "@/pages/ClientNew";
import ClientEdit from "@/pages/ClientEdit";
import { clientPlanningDraft } from "@/utils/clientPlanning";
const mocks = vi.hoisted(() => ({ admin: true, update: vi.fn(), insert: vi.fn(), toast: vi.fn(), from: vi.fn() }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: mocks.admin }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/clients/ClientAuthorizationPanel", () => ({ ClientAuthorizationPanel: () => null }));
vi.mock("jspdf", () => ({ default: vi.fn() }));
vi.mock("@/components/scheduling/AiResponseCard", () => ({ AiResponseCard: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, auth: { getUser: async () => ({ data: { user: { id: "synthetic-actor" } } }), getSession: async () => ({ data: { session: null } }) } } }));
async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.admin = true;
  mocks.from.mockImplementation((table: string) => {
    const result = { data: table === "client_status_history" ? [{ id: "history", previous_status: "not_set", new_status: "new_client", effective_date: "2026-11-04", actor_name: "Synthetic Office Admin", changed_at: "2026-11-04T23:00:00Z" }] : { id: "made-up-client" }, error: null };
    const query = { select: () => query, eq: () => query, order: () => query, single: async () => result, update: (payload: unknown) => { mocks.update(payload); return query; }, insert: (payload: unknown) => { mocks.insert(table, payload); return query; }, then: (resolve: (r: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    return query;
  });
});
afterEach(cleanup);
describe("synthetic client planning controls without sign-in", () => {
  it("saves one canonical payer and status from the record", async () => {
    const saved = vi.fn();
    render(<ClientPlanningPanel client={{ id: "made-up-client" }} onSaved={saved} />);
    await screen.findByText("Synthetic Office Admin", { exact: false });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await choose("Payer Type", "Private pay");
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ payer_type: "Private pay", status: "not_set" });
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("payers"); expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("client_status");
  });
  it("does not expose editing for non-admins", async () => {
    mocks.admin = false; render(<ClientPlanningPanel client={{ id: "made-up-client" }} onSaved={() => {}} />);
    await screen.findByText("Synthetic Office Admin", { exact: false });
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not save hospitalized status without its admit date", async () => {
    render(<ClientPlanningPanel client={{ id: "made-up-client", status: "hospitalized" }} onSaved={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" })); fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("includes selected days and notes in the editor state", () => {
    const change = vi.fn(); render(<ClientPlanningFields value={clientPlanningDraft()} onChange={change} />);
    fireEvent.click(screen.getByLabelText("Monday"));
    expect(change.mock.calls[0][0].schedule.mon.enabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Requested schedule notes"), { target: { value: "Synthetic preference" } });
    expect(change.mock.calls[1][0].scheduleNotes).toBe("Synthetic preference");
  });
  it("persists New Intake Payer Type without changing the initial assessment deadline", async () => {
    render(<ClientIntakeForm />);
    fireEvent.change(screen.getByLabelText("Client Name *"), { target: { value: "Made-up Intake Client" } });
    await choose("Payer Type", "ARChoices");
    fireEvent.click(screen.getByRole("button", { name: "Save Client & Create Assessment" }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(2));
    expect(mocks.insert.mock.calls[0]).toEqual(["clients", expect.objectContaining({ payer_type: "ARChoices", status: "not_set" })]);
    const assessment = mocks.insert.mock.calls[1][1]; expect(assessment.status).toBe("pending"); expect(assessment.assessment_type).toBe("initial");
    expect(Math.abs(new Date(assessment.assessment_deadline).getTime() - Date.now() - 48 * 3600000)).toBeLessThan(5000);
  });
  it("persists New Client additions with one payer and status", async () => {
    render(<MemoryRouter><ClientNew /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("First Name *"), { target: { value: "Made-up" } });
    fireEvent.change(screen.getByLabelText("Last Name *"), { target: { value: "Client" } });
    fireEvent.change(screen.getByLabelText("Medicaid ID *"), { target: { value: "SYNTHETIC-ONLY" } });
    await choose("Payer Type *", "VA"); fireEvent.click(screen.getByRole("button", { name: /^Add Client$/ }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(2));
    expect(mocks.insert.mock.calls[0][1][0]).toMatchObject({ payer_type: "VA", status: "not_set" });
  });
  it("hydrates and updates Edit Client without changing its assessment values", async () => {
    const record = { id: "made-up-client", first_name: "Made-up", last_name: "Client", status: "on_hold", payer_type: "Long-term care insurance", medicaid_id: "", client_status_date: "2026-11-04", client_status_reason: "Synthetic reason", form_618_expiration_date: "2027-11-04", requested_schedule: { mon: { enabled: true, start: "09:00", end: "13:00" } } };
    mocks.from.mockImplementation(() => {
      const query = { select: () => query, eq: () => query, single: async () => ({ data: record, error: null }), update: (payload: unknown) => { mocks.update(payload); return query; } };
      return query;
    });
    render(<MemoryRouter initialEntries={["/clients/made-up-client/edit"]}><Routes><Route path="/clients/:id/edit" element={<ClientEdit />} /></Routes></MemoryRouter>);
    await screen.findByLabelText("Monday");
    expect((screen.getByLabelText("Monday start time") as HTMLInputElement).value).toBe("09:00");
    await choose("Payer Type *", "ARChoices");
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ payer_type: "ARChoices", status: "on_hold", form_618_expiration_date: "2027-11-04", client_status_reason: "Synthetic reason" });
  });
});