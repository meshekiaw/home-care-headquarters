import { describe, expect, it } from 'vitest';
import { trainingLinkDetails, TRAINING_LINK_EXPIRATION_SECONDS } from '../../supabase/functions/_shared/email-templates/training-link-details';
describe('training email timing rules',()=>{
 it('uses the owner-confirmed 3600-second lifetime',()=>{expect(TRAINING_LINK_EXPIRATION_SECONDS).toBe(3600);expect(trainingLinkDetails(new Date('2026-11-06T21:08:01Z')).expiration).toBe('1 hour');});
 it('gives successive requests distinct Chicago timestamps',()=>{const first=trainingLinkDetails(new Date('2026-11-06T21:08:01Z')),second=trainingLinkDetails(new Date('2026-11-06T21:08:02Z'));expect(first.sentTime).toBe('3:08:01 PM');expect(second.sentTime).toBe('3:08:02 PM');expect(first.subject).not.toEqual(second.subject);expect(first.sentAt).not.toEqual(second.sentAt);});
 it('handles Chicago daylight saving without changing lifetime',()=>{expect(trainingLinkDetails(new Date('2026-07-06T21:08:01Z')).sentTime).toBe('4:08:01 PM');expect(trainingLinkDetails(new Date('2026-07-06T21:08:01Z')).expiration).toBe('1 hour');});
});
