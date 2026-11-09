// Mirrors the hosted Email OTP expiration reported by the owner (3600 seconds).
// Change this value when the owner changes that hosted setting; never alter Auth here.
export const TRAINING_LINK_EXPIRATION_SECONDS = 3600;
export function trainingLinkDetails(now = new Date(), expirationSeconds = TRAINING_LINK_EXPIRATION_SECONDS) {
  const sentAt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }).format(now);
  const sentTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(now);
  const duration = expirationSeconds % 3600 === 0 ? `${expirationSeconds / 3600} hour${expirationSeconds === 3600 ? '' : 's'}` : `${expirationSeconds / 60} minutes`;
  return { sentAt, sentTime, expiration: duration, subject: `Your training sign-in link (sent ${sentTime})` };
}
