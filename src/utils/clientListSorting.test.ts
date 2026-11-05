import { describe, expect, it } from "vitest";
import { clientSortFromDropdown, nextClientSort, sortClientList, type ClientSortKey, type SortableClient } from "./clientListSorting";
import { matchesClientPayer, matchesClientStatusTab } from "./clientPlanning";

function client(id: string, values: Partial<SortableClient> = {}) {
  return { id, first_name: "Synthetic", last_name: id, status: "new_client", ...values };
}
const ids = (records: { id: string }[]) => records.map(record => record.id);

describe("Client List sorting rules", () => {
  it("cycles ascending, descending, then the existing default order", () => {
    const asc = nextClientSort(null, "name");
    expect(asc).toEqual({ key: "name", direction: "asc" });
    const desc = nextClientSort(asc, "name");
    expect(desc).toEqual({ key: "name", direction: "desc" });
    expect(nextClientSort(desc, "name")).toBeNull();
    expect(ids(sortClientList([client("Zulu"), client("Alpha")], nextClientSort(desc, "name")))).toEqual(["Alpha", "Zulu"]);
  });
  it("starts a different heading ascending", () => {
    expect(nextClientSort({ key: "name", direction: "desc" }, "city")).toEqual({ key: "city", direction: "asc" });
  });
  it("sorts names by last name, then first name, in both directions", () => {
    const records = [client("z", { last_name: "Same", first_name: "Zara" }), client("a", { last_name: "Same", first_name: "Ana" }), client("b", { last_name: "Before" })];
    expect(ids(sortClientList(records, { key: "name", direction: "asc" }))).toEqual(["b", "a", "z"]);
    expect(ids(sortClientList(records, { key: "name", direction: "desc" }))).toEqual(["z", "a", "b"]);
  });
  it("sorts Contact using the displayed phone first, falling back to email", () => {
    const records = [client("blank"), client("email", { email: "z@example.invalid" }), client("phone", { phone: "555-0100", email: "a@example.invalid" })];
    expect(ids(sortClientList(records, { key: "contact", direction: "asc" }))).toEqual(["phone", "email", "blank"]);
    expect(ids(sortClientList(records, { key: "contact", direction: "desc" }))).toEqual(["email", "phone", "blank"]);
  });
  it("sorts Payer Type by its displayed label, including typed Other descriptions", () => {
    const records = [client("blank"), client("z", { payer_type: "Other", payer_type_other: "Zeta" }), client("a", { payer_type: "Other", payer_type_other: "Alpha" }), client("m", { payer_type: "Medicaid" })];
    expect(ids(sortClientList(records, { key: "payer_type", direction: "asc" }))).toEqual(["m", "a", "z", "blank"]);
    expect(ids(sortClientList(records, { key: "payer_type", direction: "desc" }))).toEqual(["z", "a", "m", "blank"]);
  });
  it("uses the exact requested Status order rather than tab order or alphabetic order", () => {
    const statuses = ["new_client", "current_needs_staffing", "current_staffed", "hospitalized", "on_hold", "discharged", "not_set", "test"];
    const records = [...statuses].reverse().map(status => client(status, { status }));
    expect(ids(sortClientList(records, { key: "status", direction: "asc" }))).toEqual(statuses);
    expect(ids(sortClientList(records, { key: "status", direction: "desc" }))).toEqual([...statuses].reverse());
  });
  const dateKeys: ClientSortKey[] = ["authorization_due_date", "form_618_expiration_date", "authorization_begin_date", "authorization_expiration_date", "created_at"];
  it.each(dateKeys)("sorts %s by actual date with blanks last in both directions", key => {
    const records = [client("blank", { [key]: null }), client("newest", { [key]: "2027-01-02" }), client("oldest", { [key]: "2025-12-31" }), client("middle", { [key]: "2026-02-01" }), client("empty", { [key]: "" })];
    expect(ids(sortClientList(records, { key, direction: "asc" }))).toEqual(["oldest", "middle", "newest", "blank", "empty"]);
    expect(ids(sortClientList(records, { key, direction: "desc" }))).toEqual(["newest", "middle", "oldest", "blank", "empty"]);
  });
  it("sorts Current 618 Date by the actual displayed form date with the existing fallback", () => {
    const records = [client("actual", { form_618_date: "2026-01-01", authorization_due_date: "2028-01-01" }), client("fallback", { authorization_due_date: "2027-01-01" }), client("blank")];
    expect(ids(sortClientList(records, { key: "authorization_due_date", direction: "asc" }))).toEqual(["actual", "fallback", "blank"]);
    expect(ids(sortClientList(records, { key: "authorization_due_date", direction: "desc" }))).toEqual(["fallback", "actual", "blank"]);
  });
  it("uses the exact authorization step order and puts the blank Test display last", () => {
    const records = [client("denied", { client_authorization_progress: { client_id: "denied", denied_on: "2026-01-01" } }), client("approved", { client_authorization_progress: { client_id: "approved", approved_on: "2026-01-01" } }), client("submitted", { client_authorization_progress: { client_id: "submitted", submitted_on: "2026-01-01" } }), client("completed", { client_authorization_progress: { client_id: "completed", assessment_completed_on: "2026-01-01" } }), client("scheduled", { client_authorization_progress: { client_id: "scheduled", assessment_scheduled_at: "2026-01-01T12:00:00Z" } }), client("not_started"), client("test", { status: "test" })];
    expect(ids(sortClientList(records, { key: "authorization_progress", direction: "asc" }))).toEqual(["not_started", "scheduled", "completed", "submitted", "approved", "denied", "test"]);
    expect(ids(sortClientList(records, { key: "authorization_progress", direction: "desc" }))).toEqual(["denied", "approved", "submitted", "completed", "scheduled", "not_started", "test"]);
  });
  it.each(["asc", "desc"] as const)("keeps same-step dates oldest first when step order is %s", direction => {
    const records = [client("newer", { client_authorization_progress: { client_id: "newer", submitted_on: "2026-11-01" } }), client("older", { client_authorization_progress: { client_id: "older", submitted_on: "2025-12-31" } })];
    expect(ids(sortClientList(records, { key: "authorization_progress", direction }))).toEqual(["older", "newer"]);
  });
  it("compares scheduled timestamps by instant including timezone offsets", () => {
    const records = [client("later", { client_authorization_progress: { client_id: "later", assessment_scheduled_at: "2026-11-05T08:00:00-06:00" } }), client("earlier", { client_authorization_progress: { client_id: "earlier", assessment_scheduled_at: "2026-11-05T13:30:00Z" } })];
    expect(ids(sortClientList(records, { key: "authorization_progress", direction: "asc" }))).toEqual(["earlier", "later"]);
  });
  it.each(["city", "contact", "payer_type", "status"] as const)("keeps blank %s last in both directions", key => {
    const values = { city: "Little Rock", phone: "555-0100", payer_type: "VA", status: "new_client" };
    const records = [client("blank", { status: "" }), client("set", values)];
    expect(ids(sortClientList(records, { key, direction: "asc" }))).toEqual(["set", "blank"]);
    expect(ids(sortClientList(records, { key, direction: "desc" }))).toEqual(["set", "blank"]);
  });
  it.each(["all", "new_client", "current_needs_staffing", "current_staffed", "hospitalized", "on_hold", "discharged", "not_set", "test"])("sorts within %s without changing membership or data", tab => {
    const records = ["new_client", "current_needs_staffing", "current_staffed", "hospitalized", "on_hold", "discharged", "not_set", "test"].flatMap(status => [client(`${status}-z`, { status, payer_type: "VA" }), client(`${status}-a`, { status, payer_type: "Medicaid" })]);
    const snapshot = JSON.stringify(records);
    const filtered = records.filter(record => matchesClientStatusTab(record, tab) && matchesClientPayer(record, "VA"));
    const sorted = sortClientList(filtered, { key: "name", direction: "desc" });
    expect(ids(sorted).sort()).toEqual(ids(filtered).sort());
    expect(sorted.length).toBe(tab === "all" ? 7 : 1);
    expect(JSON.stringify(records)).toBe(snapshot);
  });
  it("preserves equal-value input order and never mutates the input", () => {
    const records = [client("z", { city: "Same" }), client("a", { city: "Same" })];
    expect(ids(sortClientList(records, { key: "city", direction: "desc" }))).toEqual(["z", "a"]);
    expect(ids(records)).toEqual(["z", "a"]);
  });
  it("keeps existing dropdown options usable and Date Added newest-first", () => {
    expect(clientSortFromDropdown("city")).toEqual({ key: "city", direction: "asc" });
    expect(clientSortFromDropdown("created_at")).toEqual({ key: "created_at", direction: "desc" });
    expect(clientSortFromDropdown("default")).toBeNull();
  });
});