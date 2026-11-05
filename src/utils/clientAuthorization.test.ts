import { describe, expect, it } from 'vitest';
import { authorizationDate, authorizationDraft, authorizationPayload, authorizationStep, authorizationWaiting, matchesAuthorizationFilter } from './clientAuthorization';
describe('authorization progress rules', () => {
  it('starts blank without an assessment', () => { expect(authorizationStep().value).toBe('not_started'); expect(authorizationPayload(authorizationDraft())).toEqual({ submitted_on:null,approved_on:null,denied_on:null,denial_reason:null }); });
  it('prioritizes completed assessment then office milestones', () => { expect(authorizationStep({client_id:'made-up',assessment_scheduled_at:'2026-11-04T15:00Z',assessment_completed_on:'2026-11-04'}).value).toBe('assessment_completed'); expect(authorizationStep({client_id:'made-up',assessment_completed_on:'2026-11-04',submitted_on:'2026-11-05'}).value).toBe('submitted'); });
  it('uses denial instead of approval', () => { expect(authorizationPayload({submitted:true,submittedOn:'2026-11-04',decision:'denied',decisionOn:'2026-11-05',reason:'Synthetic denial'})).toEqual({submitted_on:'2026-11-04',approved_on:null,denied_on:'2026-11-05',denial_reason:'Synthetic denial'}); });
  it('requires submitted date', () => { expect(()=>authorizationPayload({...authorizationDraft(),submitted:true})).toThrow('submitted date'); });
  it.each(['approved','denied'] as const)('requires %s date', decision => { expect(()=>authorizationPayload({...authorizationDraft(),decision,reason:'Synthetic'})).toThrow('decision date'); });
  it('requires denial reason', () => { expect(()=>authorizationPayload({...authorizationDraft(),decision:'denied',decisionOn:'2026-11-04',reason:' '})).toThrow('denial reason'); });
  it('warns at 15 calendar days, not 14, using Chicago office dates', () => { const p={client_id:'made-up',submitted_on:'2026-10-21'}; expect(authorizationWaiting(p,new Date('2026-11-05T03:19Z'))).toBe(false); expect(authorizationWaiting(p,new Date('2026-11-05T06:00Z'))).toBe(true); });
  it.each([{approved_on:'2026-10-22'},{denied_on:'2026-10-22'}])('never warns after a decision %j', decision => { expect(authorizationWaiting({client_id:'made-up',submitted_on:'2026-10-01',...decision},new Date('2026-11-05T10:00Z'))).toBe(false); });
  it('excludes Test from every authorization filter and count', () => { for (const filter of ['all','not_started','assessment_scheduled','assessment_completed','submitted','waiting','approved','denied']) expect(matchesAuthorizationFilter('test',{client_id:'test',submitted_on:'2026-10-01'},filter)).toBe(false); });
  it('preserves date-only values and actual appointment time', () => { expect(authorizationDate('2026-11-04')).toBe('11/04/2026'); expect(authorizationDate('2026-11-04T15:00Z')).toContain('9:00 AM'); });
  it('only saves independent office fields', () => { expect(Object.keys(authorizationPayload(authorizationDraft())).sort()).toEqual(['approved_on','denial_reason','denied_on','submitted_on']); });
});
