// Compatibility audit only. These retained tables never decide whether mail sends.
export interface EmailStore {
  from(table: string): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: { code?: string; message: string } | null }>
    upsert(row: Record<string, unknown>, options: { onConflict: string; ignoreDuplicates?: boolean }): PromiseLike<{ error: { code?: string; message: string } | null }>
  }
}

export async function recordEmailSend(
  store: EmailStore,
  templateName: string,
  recipient: string,
  status: 'sent' | 'suppressed' | 'failed',
  errorMessage?: string,
): Promise<void> {
  try {
    const { error } = await store.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipient,
      status,
      error_message: errorMessage?.slice(0, 1000) ?? null,
    })
    if (error) console.error('Email audit write failed', { code: error.code, message: error.message })
  } catch {
    console.error('Email audit write unavailable')
  }
}

const OUTCOMES = {
  'email.bounced': { reason: 'bounce', status: 'bounced', message: 'Permanent bounce — email address is invalid or rejected' },
  'email.complaint': { reason: 'complaint', status: 'complained', message: 'Spam complaint — recipient marked email as spam' },
  'email.unsubscribed': { reason: 'unsubscribe', status: 'suppressed', message: 'Recipient unsubscribed' },
} as const

export type TerminalEmailType = keyof typeof OUTCOMES
export interface TerminalEmailEvent {
  event_id: string
  data: { recipient: string; message_id?: string }
}

// Deterministic primary key makes repeated/concurrent deliveries append exactly once.
// No new table or constraint is needed; metadata retains the legacy null value.
async function eventLogId(eventId: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`email-event:${eventId}`)))
  digest[6] = (digest[6] & 0x0f) | 0x50
  digest[8] = (digest[8] & 0x3f) | 0x80
  const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function recordTerminalEmailEvent(store: EmailStore, type: TerminalEmailType, event: TerminalEmailEvent): Promise<void> {
  const outcome = OUTCOMES[type]
  const recipient = event.data.recipient.toLowerCase()
  const writes = [
    await store.from('suppressed_emails').upsert({ email: recipient, reason: outcome.reason, metadata: null }, { onConflict: 'email' }),
  ]
  if (writes[0].error) {
    const error = writes[0].error
    console.error('Email event write failed', { event_id: event.event_id, code: error.code, message: error.message })
    throw new Error('Email event write failed')
  }
  const { error } = await store.from('email_send_log').upsert({
    id: await eventLogId(event.event_id),
    message_id: event.data.message_id ?? null,
    template_name: 'system',
    recipient_email: recipient,
    status: outcome.status,
    error_message: outcome.message,
    metadata: null,
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) {
    console.error('Email event write failed', { event_id: event.event_id, code: error.code, message: error.message })
    throw new Error('Email event write failed')
  }
}