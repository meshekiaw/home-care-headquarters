// Sender repair is forward-only. Existing notification history is never replayed.
export const NOTIFICATION_EMAIL_CUTOVER = '2026-11-02T13:59:00Z'

export function isNewNotification(createdAt: unknown): boolean {
  if (typeof createdAt !== 'string') return false
  const timestamp = Date.parse(createdAt)
  return Number.isFinite(timestamp) && timestamp >= Date.parse(NOTIFICATION_EMAIL_CUTOVER)
}