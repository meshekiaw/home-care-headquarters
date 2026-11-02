import { describe, expect, it, vi } from 'vitest'
import { recordTerminalEmailEvent, sendWithEmailAudit, type EmailStore, type TerminalEmailType } from '../../supabase/functions/_shared/email-outcomes'

function makeStore() {
  const rows = new Map<string, Record<string, unknown>[]>()
  const failures = new Map<string, { code: string; message: string }>()
  const store: EmailStore = {
    from: (table) => ({
      insert: async (row) => {
        const error = failures.get(table) ?? null
        if (!error) rows.set(table, [...(rows.get(table) ?? []), row])
        return { error }
      },
      upsert: async (row, options) => {
        const error = failures.get(table) ?? null
        if (error) return { error }
        const current = rows.get(table) ?? []
        const index = current.findIndex(existing => existing[options.onConflict] === row[options.onConflict])
        if (index < 0) current.push(row)
        else if (!options.ignoreDuplicates) current[index] = row
        rows.set(table, current)
        return { error: null }
      },
    }),
  }
  return { store, rows, failures }
}

describe('managed email retained audit contract', () => {
  it('records sent only after a send succeeds', async () => {
    const { store, rows } = makeStore()
    const result = await sendWithEmailAudit(store, 'lms-assignment-notification', 'test-caregiver@example.invalid', async () => {
      expect(rows.size).toBe(0)
      return { sent: true }
    })
    expect(result).toEqual({ sent: true })
    expect(rows.get('email_send_log')).toEqual([expect.objectContaining({ status: 'sent', template_name: 'lms-assignment-notification', message_id: null })])
  })

  it('records suppression as a normal unsuccessful outcome without retrying', async () => {
    const { store, rows } = makeStore()
    const send = vi.fn(async () => ({ sent: false as const, reason: 'recipient_suppressed' as const }))
    expect(await sendWithEmailAudit(store, 'system-notification', 'test-caregiver@example.invalid', send)).toEqual({ sent: false, reason: 'recipient_suppressed' })
    expect(send).toHaveBeenCalledTimes(1)
    expect(rows.get('email_send_log')?.[0].status).toBe('suppressed')
  })

  it('records failure and preserves the original error', async () => {
    const { store, rows } = makeStore()
    const failure = new Error('provider refused')
    await expect(sendWithEmailAudit(store, 'system-notification', 'test-caregiver@example.invalid', async () => { throw failure })).rejects.toBe(failure)
    expect(rows.get('email_send_log')?.[0]).toEqual(expect.objectContaining({ status: 'failed', error_message: 'provider refused' }))
  })

  it('audit errors cannot turn successful sends into failures', async () => {
    const { store, failures } = makeStore()
    failures.set('email_send_log', { code: 'db', message: 'audit unavailable' })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(await sendWithEmailAudit(store, 'system-notification', 'test-caregiver@example.invalid', async () => ({ sent: true }))).toEqual({ sent: true })
      expect(log).toHaveBeenCalled()
    } finally { log.mockRestore() }
  })
})

describe('terminal email events', () => {
  const cases: [TerminalEmailType, string, string, string][] = [
    ['email.bounced', 'bounce', 'bounced', 'Permanent bounce — email address is invalid or rejected'],
    ['email.complaint', 'complaint', 'complained', 'Spam complaint — recipient marked email as spam'],
    ['email.unsubscribed', 'unsubscribe', 'suppressed', 'Recipient unsubscribed'],
  ]
  it.each(cases)('%s preserves exact stored reason and status', async (type, reason, status, message) => {
    const { store, rows } = makeStore()
    await recordTerminalEmailEvent(store, type, { event_id: 'event-test', data: { recipient: 'TEST-CAREGIVER@EXAMPLE.INVALID', message_id: 'message-test' } })
    expect(rows.get('suppressed_emails')).toEqual([{ email: 'test-caregiver@example.invalid', reason, metadata: null }])
    expect(rows.get('email_send_log')).toEqual([expect.objectContaining({ status, error_message: message, template_name: 'system', metadata: null, message_id: 'message-test' })])
  })

  it('deduplicates redelivery and appends distinct events without changing earlier rows', async () => {
    const { store, rows } = makeStore()
    const data = { recipient: 'test-caregiver@example.invalid' }
    await Promise.all(Array.from({ length: 3 }, () => recordTerminalEmailEvent(store, 'email.bounced', { event_id: 'same-event', data })))
    await recordTerminalEmailEvent(store, 'email.complaint', { event_id: 'different-event', data })
    expect(rows.get('email_send_log')?.map(row => row.status)).toEqual(['bounced', 'complained'])
    expect(rows.get('email_send_log')?.[0].message_id).toBeNull()
  })

  it.each(['suppressed_emails', 'email_send_log'])('throws for %s write errors so delivery retries', async (table) => {
    const { store, failures } = makeStore()
    failures.set(table, { code: '23514', message: 'constraint rejection' })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(recordTerminalEmailEvent(store, 'email.bounced', { event_id: 'failed-event', data: { recipient: 'test-caregiver@example.invalid' } })).rejects.toThrow('Email event write failed')
      expect(log).toHaveBeenCalledWith('Email event write failed', { event_id: 'failed-event', code: '23514', message: 'constraint rejection' })
    } finally { log.mockRestore() }
  })
})