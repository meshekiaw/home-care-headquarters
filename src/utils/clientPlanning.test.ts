import { describe, expect, it } from "vitest";
import { CLIENT_PAYERS, WEEK_DAYS, clientPlanningDraft, clientPlanningPayload, clientPayerLabel, clientStatusCounts, matchesClientPayer, requestedWeeklyHours, requestedScheduleSummary, validateClientPlanning, type RequestedSchedule } from "./clientPlanning";
const workWeek: RequestedSchedule = Object.fromEntries(WEEK_DAYS.slice(0, 5).map(d => [d.key, { enabled: true, start: "09:00", end: "13:00" }]));
describe("client planning rules with made-up clients", () => {
  it("reads canonical payer and status without inference", () => {
    expect(clientPlanningDraft({ payer_type: "VA", status: "hospitalized" })).toMatchObject({ payerType: "VA", status: "hospitalized" });
  });
  it.each(["Medicaid", "ARChoices", "PASSE", "VA", "Private pay", "Long-term care insurance", "Other"])("round-trips payer type %s", payerType => {
    const draft = { ...clientPlanningDraft(), payerType, payerOther: "Synthetic insurer" };
    expect(clientPlanningPayload(draft).payer_type).toBe(payerType);
    expect(clientPlanningPayload(clientPlanningDraft(clientPlanningPayload(draft)))).toEqual(clientPlanningPayload(draft));
  });
  it("requires Other text", () => { expect(validateClientPlanning({ ...clientPlanningDraft(), payerType: "Other", payerOther: " " })).toBeTruthy(); });
  it("filters the stored Payer Type only", () => { expect(matchesClientPayer({ payer_type: "VA" }, "VA")).toBe(true); expect(matchesClientPayer({ payer_type: "VA" }, "ARChoices")).toBe(false); });
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
  it("counts each single status and All separately", () => { expect(clientStatusCounts([{}, { status: "current_staffed" }, { status: "hospitalized" }, { status: "hospitalized" }])).toMatchObject({ all: 4, not_set: 1, current_staffed: 1, hospitalized: 2, discharged: 0 }); });
  it("never writes duplicate payer/status fields or assessment hours/dates", () => {
    const payload = clientPlanningPayload({ ...clientPlanningDraft(), payerType: "VA", schedule: workWeek, status: "new_client" });
    for (const key of ["payers", "payer_other", "client_status", "client_hours", "form_618_date", "form_618_expiration_date", "nurse_visit_due_date", "authorization_due_date"]) expect(Object.keys(payload)).not.toContain(key);
  });
  it("round-trips edit values without creating different weekly times", () => {
    const payload = clientPlanningPayload({ ...clientPlanningDraft(), payerType: "ARChoices", schedule: workWeek, scheduleNotes: "Morning preferred", status: "on_hold", statusDate: "2026-11-04", statusReason: "Synthetic hold" });
    expect(clientPlanningPayload(clientPlanningDraft(payload))).toEqual(payload);
  });
});