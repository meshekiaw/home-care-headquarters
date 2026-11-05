// @vitest-environment happy-dom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Clients from "./Clients";

const mocks = vi.hoisted(() => ({ from: vi.fn(), writes: vi.fn(), auth: vi.fn(), records: [] as Record<string, unknown>[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, auth: { getUser: mocks.auth } } }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/clients/BulkImportDialog", () => ({ default: () => null }));
vi.mock("@/components/clients/ClientIntakeForm", () => ({ default: () => null }));
vi.mock("@/components/clients/OnboardingPipeline", () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.records = ["new_client", "current_needs_staffing", "current_staffed", "hospitalized", "on_hold", "discharged", "not_set", "test"].flatMap((status, index) => ["Zulu", "Alpha"].map((name, i) => ({ id: `${status}-${name}`, first_name: "Synthetic", last_name: name, status, payer_type: "VA", phone: i === 0 ? "555-0200" : "555-0100", email: null, city: name, created_at: `2026-11-${String(index + i + 1).padStart(2, "0")}T00:00:00Z`, form_618_date: i === 0 ? "2027-01-02" : "2025-12-31", form_618_expiration_date: i === 0 ? "2028-01-02" : "2026-12-31", authorization_begin_date: i === 0 ? "2026-11-01" : "2026-01-01", authorization_expiration_date: i === 0 ? "2027-11-01" : "2027-01-01" })));
  mocks.from.mockImplementation(() => {
    const q = { select: () => q, order: async () => ({ data: mocks.records, error: null }), update: mocks.writes, insert: mocks.writes, delete: mocks.writes };
    return q;
  });
});
afterEach(cleanup);
async function open() {
  render(<MemoryRouter><Clients /></MemoryRouter>);
  await screen.findByRole("button", { name: "Name", exact: true });
}
function rowIds() {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>("tbody td:nth-child(2) a")).map(link => link.getAttribute("href")?.replace("/clients/", ""));
}
async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: option, exact: true }));
}

describe("synthetic Client List sorting without sign-in", () => {
  it.each(["Name", "Contact", "Location", "Status", "Payer Type", "Authorization progress", "Current 618 Date", "618 Expiration Date", "Authorization Begin Date", "Authorization Expiration Date"])("cycles the %s heading and synchronizes the dropdown", async heading => {
    await open();
    const defaults = rowIds();
    const button = screen.getByRole("button", { name: heading, exact: true });
    fireEvent.click(button);
    const th = button.closest("th");
    expect(th?.getAttribute("aria-sort")).toBe("ascending");
    expect(screen.getByRole("combobox", { name: "Sort by" }).textContent).toContain(heading === "Location" ? "City" : heading === "Authorization Expiration Date" ? "Auth Expiration Date" : heading);
    fireEvent.click(button);
    expect(th?.getAttribute("aria-sort")).toBe("descending");
    fireEvent.click(button);
    expect(th?.hasAttribute("aria-sort")).toBe(false);
    expect(rowIds()).toEqual(defaults);
    expect(mocks.writes).not.toHaveBeenCalled();
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("dropdown selections update the matching heading and preserve subsequent tap direction", async () => {
    await open();
    await choose("Sort by", "618 Expiration Date");
    const button = screen.getByRole("button", { name: "618 Expiration Date", exact: true });
    expect(button.closest("th")?.getAttribute("aria-sort")).toBe("ascending");
    expect(rowIds()[0]).toBe("new_client-Alpha");
    fireEvent.click(button);
    expect(button.closest("th")?.getAttribute("aria-sort")).toBe("descending");
    expect(rowIds()[0]).toBe("new_client-Zulu");
    await choose("Sort by", "Date Added");
    expect(document.querySelector("th[aria-sort]")).toBeNull();
    expect(rowIds()[0]).toBe("not_set-Alpha");
  });
  it.each(["All", "New client", "Current – needs staffing", "Current – staffed", "Hospitalized", "On hold", "Discharged", "Not set", "Test"])("keeps the %s tab and filtered/search membership when sorting", async tab => {
    await open();
    const groups = screen.getByRole("tablist", { name: "Client status groups" });
    fireEvent.click(within(groups).getByRole("tab", { name: new RegExp(`^${tab} `) }));
    await choose("Payer Type filter", "VA");
    fireEvent.change(screen.getByPlaceholderText("Search clients by name, email, or phone..."), { target: { value: "Synthetic" } });
    const before = rowIds();
    fireEvent.click(screen.getByRole("button", { name: "Name", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Name", exact: true }));
    expect(rowIds()).toEqual([...before].reverse());
    expect(within(groups).getByRole("tab", { name: new RegExp(`^${tab} `) }).getAttribute("data-state")).toBe("active");
    expect(screen.getByRole("combobox", { name: "Payer Type filter" }).textContent).toContain("VA");
    expect((screen.getByPlaceholderText("Search clients by name, email, or phone...") as HTMLInputElement).value).toBe("Synthetic");
    expect(before.length).toBe(tab === "All" ? 14 : 2);
    expect(mocks.writes).not.toHaveBeenCalled();
  });
  it("preserves authorization and date filters through all three sort states", async () => {
    await open();
    await choose("Authorization progress filter", "Not started (14)");
    fireEvent.click(screen.getByRole("button", { name: "Filters", exact: true }));
    const monthSelectors = screen.getAllByRole("combobox").filter(box => box.textContent === "All");
    fireEvent.click(monthSelectors[1]);
    fireEvent.click(await screen.findByRole("option", { name: "January 2027", exact: true }));
    const before = rowIds();
    expect(before).toHaveLength(7);
    for (let tap = 0; tap < 3; tap++) fireEvent.click(screen.getByRole("button", { name: "Status", exact: true }));
    expect(rowIds()).toEqual(before);
    expect(screen.getByRole("combobox", { name: "Authorization progress filter" }).textContent).toContain("Not started");
  });
});