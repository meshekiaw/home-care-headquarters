import { describe, expect, it } from "vitest";
import { ACTIVE_CLIENT_STATUSES, CLIENT_STATUSES, consolidatedClientStatus, clientStatusCounts, matchesClientStatusTab, isActiveClient, isOperationalClient, clientPlanningDraft, clientPlanningPayload } from "./clientPlanning";
import { validateAndTransformClients } from "./csvParser";
import { formatClientForExport } from "./csvExport";

describe("client consolidation requirements using invented records", () => {
  it.each([['pending','not_set','new_client'],['active','not_set','not_set'],['inactive','not_set','discharged'],['unknown','not_set','discharged'],['active','hospitalized','hospitalized'],['pending','on_hold','on_hold']])("maps %s and %s to %s", (old, chosen, expected) => expect(consolidatedClientStatus(old, chosen)).toBe(expected));
  it.each(['current_staffed','current_needs_staffing','hospitalized','on_hold','not_set'])("counts %s as active", status => expect(isActiveClient({ status })).toBe(true));
  it.each(['new_client','discharged','test'])("does not count %s as active", status => expect(isActiveClient({ status })).toBe(false));
  it("keeps Test only in its own tab and out of All and ordinary counts", () => {
    const records = CLIENT_STATUSES.map(s => ({ status: s.value }));
    const counts = clientStatusCounts(records);
    expect(counts.all).toBe(7); expect(counts.test).toBe(1);
    for (const tab of ['all', ...CLIENT_STATUSES.filter(s => s.value !== 'test').map(s => s.value)]) expect(matchesClientStatusTab({ status: 'test' }, tab)).toBe(false);
    expect(matchesClientStatusTab({ status: 'test' }, 'test')).toBe(true);
    expect(matchesClientStatusTab({ status: 'not_set' }, 'test')).toBe(false);
  });
  it("exports only non-Test rows even from a selection containing Test", () => {
    const records = [{ first_name:'Made-up',last_name:'Ordinary',status:'not_set',created_at:'2026-11-05',payer_type:'VA' },{ first_name:'Made-up',last_name:'Test',status:'test',created_at:'2026-11-05',payer_type:'Medicaid' }];
    const exported = records.filter(isOperationalClient).map(formatClientForExport);
    expect(exported).toHaveLength(1); expect(exported[0].last_name).toBe('Ordinary');
  });
  it.each(['Medicaid','ARChoices','PASSE','VA','Private pay','Long-term care insurance','Other'])("imports/exports %s without coercion", payer_type => {
    const result = validateAndTransformClients([{ first_name:'Made-up',last_name:'Client',payer_type,payer_type_other:'Synthetic insurer',medicaid_id:'TEST-ID',status:'not_set' }]);
    expect(result.errors).toEqual([]); expect(result.clients[0].payer_type).toBe(payer_type);
    expect(formatClientForExport({ ...result.clients[0],created_at:'2026-11-05' }).payer_type).toBe(payer_type);
  });
  it("refuses Other without text rather than guessing Medicaid", () => expect(validateAndTransformClients([{first_name:'Made-up',last_name:'Client',payer_type:'Other'}]).clients).toEqual([]));
  it.each(['hospitalized','on_hold','discharged'])("validates imported %s dates/reasons", status => {
    expect(validateAndTransformClients([{first_name:'Made-up',last_name:'Client',payer_type:'VA',status}]).clients).toEqual([]);
    expect(validateAndTransformClients([{first_name:'Made-up',last_name:'Client',payer_type:'VA',status,client_status_date:'2026-11-05',client_status_reason:'Synthetic reason'}]).clients[0].status).toBe(status);
  });
  it("keeps saved requested schedule and notes during payer/status consolidation", () => {
    const record = {payer_type:'VA',status:'hospitalized',client_status_date:'2026-11-05',requested_schedule:{mon:{enabled:true,start:'09:00',end:'13:00'}},requested_schedule_notes:'Synthetic morning preference'};
    const payload = clientPlanningPayload(clientPlanningDraft(record));
    expect(payload.requested_schedule).toEqual(record.requested_schedule);
    expect(payload.requested_schedule_notes).toBe(record.requested_schedule_notes);
    expect(payload).not.toHaveProperty('client_status'); expect(payload).not.toHaveProperty('payers');
  });
});