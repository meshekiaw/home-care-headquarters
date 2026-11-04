import { describe, expect, it } from "vitest";
import { CLIENT_PAYERS, WEEK_DAYS, clientPlanningDraft, clientPlanningPayload, clientPayerLabel, clientStatusCounts, matchesClientPayer, requestedWeeklyHours, requestedScheduleSummary, validateClientPlanning, type RequestedSchedule } from "./clientPlanning";
const workWeek: RequestedSchedule = Object.fromEntries(WEEK_DAYS.slice(0, 5).map(d => [d.key, { enabled: true, start: "09:00", end: "13:00" }]));
describe("client planning rules with made-up clients", () => {
  it("never guesses existing payers or status from legacy fields", () => {
    const legacy = { payer_type: "VA", status: "active" };
    const draft = clientPlanningDraft(legacy as Parameters<typeof clientPlanningDraft>[0]);
    expect(draft.payers).toEqual([]); expect(draft.status).toBe("not_set"); expect(clientPayerLabel({})).toBe("Not set");
  });
  it("allows all five payer selections together with a typed Other", () => {
    const draft = { ...clientPlanningDraft(), payers: [...CLIENT_PAYERS], payerOther: "Synthetic insurer" };
    expect(clientPlanningPayload(draft).payers).toEqual(["Medicaid personal care", "ARChoices", "VA", "Private pay", "Other"]);
    expect(clientPlanningPayload(draft).payer_other).toBe("Synthetic insurer");
  });
  it("requires an Other description", () => { expect(validateClientPlanning({ ...clientPlanningDraft(), payers: ["Other"], payerOther: " " })).toBeTruthy(); });
  it("matches any selected payer and keeps Not set distinct", () => {
    const client = { payers: ["VA", "Private pay"] };
    expect(matchesClientPayer(client, "VA")).toBe(true); expect(matchesClientPayer(client, "Private pay")).toBe(true);
    expect(matchesClientPayer(client, "ARChoices")).toBe(false); expect(matchesClientPayer(client, "not_set")).toBe(false); expect(matchesClientPayer({}, "not_set")).toBe(true);
  });
  it("calculates Mon–Fri 09:00–13:00 as exactly 20 requested hours", () => {
    expect(requestedWeeklyHours(workWeek)).toBe(20); expect(requestedScheduleSummary(workWeek)).toBe("Mon–Fri 9:00 AM–1:00 PM · 20 hrs/wk");
  });
  it("excludes unchecked days and counts partial hours accurately", () => { expect(requestedWeeklyHours({ mon: { enabled: false, start: "09:00", end: "13:00" }, tue: { enabled: true, start: "09:15", end: "10:45" } })).toBe(1.5); });
  it("handles overnight hours as next-day end instead of negative totals", () => { expect(requestedWeeklyHours({ sat: { enabled: true, start: "22:00", end: "02:00" } })).toBe(4); });
  it("requires both valid times for checked days", () => { for (const end of ["", "09:00", "25:00"]) expect(validateClientPlanning({ ...clientPlanningDraft(), schedule: { mon: { enabled: true, start: "09:00", end } } })).toBeTruthy(); });
  it("requires hospitalized admit date while return date is optional", () => {
    const draft = { ...clientPlanningDraft(), status: "hospitalized" };
    expect(validateClientPlanning(draft)).toBeTruthy(); expect(validateClientPlanning({ ...draft, statusDate: "2026-11-04" })).toBeNull();
    expect(clientPlanningPayload({ ...draft, statusDate: "2026-11-04" }).expected_return_date).toBeNull();
  });
  it("rejects a return before admission", () => { expect(validateClientPlanning({ ...clientPlanningDraft(), status: "hospitalized", statusDate: "2026-11-04", expectedReturn: "2026-11-03" })).toBeTruthy(); });
  it.each(["on_hold", "discharged"])("requires date and reason for %s", status => {
    const draft = { ...clientPlanningDraft(), status };
    expect(validateClientPlanning(draft)).toBeTruthy(); expect(validateClientPlanning({ ...draft, statusDate: "2026-11-04", statusReason: " " })).toBeTruthy(); expect(validateClientPlanning({ ...draft, statusDate: "2026-11-04", statusReason: "Synthetic reason" })).toBeNull();
  });
  it("counts each single status and All separately", () => { expect(clientStatusCounts([{}, { client_status: "current_staffed" }, { client_status: "hospitalized" }, { client_status: "hospitalized" }])).toMatchObject({ all: 4, not_set: 1, current_staffed: 1, hospitalized: 2, discharged: 0 }); });
  it("never puts legacy activity, assessment payer, hours or dates into planning updates", () => {
    const payload = clientPlanningPayload({ ...clientPlanningDraft(), payers: ["VA"], schedule: workWeek, status: "new_client" });
    for (const key of ["status", "payer_type", "client_hours", "form_618_date", "form_618_expiration_date", "nurse_visit_due_date", "authorization_due_date"]) expect(Object.keys(payload)).not.toContain(key);
  });
  it("round-trips edit values without creating different weekly times", () => {
    const payload = clientPlanningPayload({ ...clientPlanningDraft(), payers: ["ARChoices"], schedule: workWeek, scheduleNotes: "Morning preferred", status: "on_hold", statusDate: "2026-11-04", statusReason: "Synthetic hold" });
    expect(clientPlanningPayload(clientPlanningDraft(payload))).toEqual(payload);
  });
});