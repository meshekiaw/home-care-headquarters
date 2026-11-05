import { readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { isNewNotification, NOTIFICATION_EMAIL_CUTOVER } from '../../supabase/functions/_shared/notification-email-policy'

// Execute the real edge modules with provider, auth and database replaced
// in memory. No real email, account, credential, or database is accessed.
function harness(rows: Record<string, any[]> = {}) {
  const send = vi.fn(async (..._args: any[]) => undefined)
  const mutations = vi.fn()
  const handlers = new Map<string, (req: Request) => Promise<Response>>()
  const cache = new Map<string, { exports: any }>()
  let authOptions: any
  const env: Record<string, string> = { LOVABLE_API_KEY: 'mock-email', SUPABASE_URL: 'https://mock.invalid', SUPABASE_SERVICE_ROLE_KEY: 'mock-service', SUPABASE_ANON_KEY: 'mock-anon' }
  const client = {
    rpc: async (name: string, args: { p_id: string }) => ({ data: name === 'client_record_is_test' && (rows.test_records ?? []).some(r => r.id === args.p_id), error: null }),
    auth: { getUser: async () => ({ data: { user: { id: 'mock-admin' } } }) },
    from: (table: string) => {
      let data = [...(rows[table] ?? [])]
      let single = false
      const query: any = {
        select: () => query,
        eq: (c: string, v: any) => { data = data.filter(r => r[c] === v); return query },
        neq: (c: string, v: any) => { data = data.filter(r => c.split('.').reduce((value: any, key) => value?.[key], r) !== v); return query },
        is: (c: string, v: any) => { data = data.filter(r => (r[c] ?? null) === v); return query },
        in: (c: string, v: any[]) => { data = data.filter(r => v.includes(r[c])); return query },
        gte: (c: string, v: any) => { data = data.filter(r => r[c] >= v); return query },
        lt: (c: string, v: any) => { data = data.filter(r => r[c] < v); return query },
        lte: (c: string, v: any) => { data = data.filter(r => r[c] <= v); return query },
        not: () => query,
        like: (c: string, v: string) => { data = data.filter(r => new RegExp(`^${v.replace(/%/g, '.*')}$`).test(r[c])); return query },
        limit: (n: number) => { data = data.slice(0, n); return query },
        single: () => { single = true; return query },
        maybeSingle: () => { single = true; return query },
        insert: (r: any) => { mutations(table, 'insert', r); data = []; return query },
        update: (r: any) => { mutations(table, 'update', r); data = []; return query },
        then: (resolve: any, reject: any) => Promise.resolve({ data: single ? data[0] ?? null : data, error: null }).then(resolve, reject),
      }
      return query
    },
  }
  function load(relative: string): any {
    const file = path.resolve(relative)
    const cached = cache.get(file)
    if (cached) return cached.exports
    const module = { exports: {} as any }
    cache.set(file, module)
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
    const requireMock = (s: string): any => {
      if (s.endsWith('/registry.ts') || s === './registry.ts') return { TEMPLATES: { 'lms-assignment-notification': { component: () => null, subject: 'Existing subject' } } }
      if (s.includes('/email-templates/')) return new Proxy({}, { get: () => () => null })
      if (s.startsWith('.')) return load(path.resolve(path.dirname(file), s))
      if (s.includes('email-js')) return { sendLovableEmail: send, EmailAPIError: class extends Error {}, createAuthEmailHandler: (o: any) => { authOptions = o; return async () => new Response('ok') } }
      if (s.includes('supabase-js')) return { createClient: () => client }
      if (s.includes('html-to-text')) return { convert: () => 'Existing text' }
      if (s.includes('@react-email/components')) return { renderAsync: async () => 'Existing rendered content' }
      if (s.includes('react@')) return { createElement: () => ({}) }
      if (s.includes('/http/server.ts')) return { serve: (h: any) => handlers.set(file, h) }
      throw new Error(`Unexpected dependency: ${s}`)
    }
    const deno = { env: { get: (k: string) => env[k] }, serve: (h: any) => handlers.set(file, h) }
    new Function('require', 'module', 'exports', 'Deno', code)(requireMock, module, module.exports, deno)
    return module.exports
  }
  async function invoke(name: string, body: any) {
    const file = path.resolve(`supabase/functions/${name}/index.ts`)
    load(file)
    const handler = handlers.get(file)
    if (!handler) throw new Error('No handler captured')
    return handler(new Request('https://mock.invalid', { method: 'POST', headers: { Authorization: 'Bearer mock-only' }, body: JSON.stringify(body) }))
  }
  return { load, send, mutations, invoke, authOptions: () => authOptions }
}

describe('verified-domain envelope', () => {
  it('composed notifications use the verified domain and retain recipient, subject, message and event key', async () => {
    const h = harness()
    const { sendAppEmail } = h.load('supabase/functions/_shared/send-app-email.ts')
    expect(await sendAppEmail('test-caregiver@example.invalid', 'Existing subject', '<p>Existing message</p>', { idempotencyKey: 'new-event' })).toEqual({ success: true })
    expect(h.send).toHaveBeenCalledTimes(1)
    expect(h.send.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ from: 'Home Care Headquarters <noreply@notify.homecareheadquarters.org>', sender_domain: 'notify.homecareheadquarters.org', to: 'test-caregiver@example.invalid', subject: 'Existing subject', idempotency_key: 'new-event', html: expect.stringContaining('<p>Existing message</p>') }))
  })
  it('template notifications use the verified domain and retain the envelope', async () => {
    const h = harness()
    const { sendTemplateEmail } = h.load('supabase/functions/_shared/transactional-email-templates/send-email.ts')
    await sendTemplateEmail('lms-assignment-notification', 'test-caregiver@example.invalid', { idempotencyKey: 'new-assignment' })
    expect(h.send.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ from: 'Home Care Headquarters <noreply@notify.homecareheadquarters.org>', sender_domain: 'notify.homecareheadquarters.org', to: 'test-caregiver@example.invalid', subject: 'Existing subject', idempotency_key: 'new-assignment' }))
  })
  it('all six auth types use the verified From domain without sending', () => {
    const h = harness()
    h.load('supabase/functions/auth-email-hook/index.ts')
    expect(h.authOptions().from).toBe('Home Care Headquaters <noreply@notify.homecareheadquarters.org>')
    expect(h.authOptions().senderDomain).toBe('notify.homecareheadquarters.org')
    expect(Object.keys(h.authOptions().emails).sort()).toEqual(['email_change', 'invite', 'magiclink', 'reauthentication', 'recovery', 'signup'])
    expect(h.send).not.toHaveBeenCalled()
  })
})

describe('forward-only repair', () => {
  it('only notifications from November 2, 2026 at 13:59 UTC onward are new; unknown dates fail closed', () => {
    expect(NOTIFICATION_EMAIL_CUTOVER).toBe('2026-11-02T13:59:00Z')
    expect(isNewNotification('2026-11-02T13:58:59.999Z')).toBe(false)
    expect(isNewNotification('2026-11-02T13:59:00Z')).toBe(true)
    expect(isNewNotification(undefined)).toBe(false)
    expect(isNewNotification('invalid')).toBe(false)
  })
  it('old failed resends return before email, SMS or historical record updates', async () => {
    const h = harness({ notifications: [{ id: 'old', created_at: '2026-11-01T12:00:00Z', email_sent: false, sms_sent: false, recipient_email: 'test-caregiver@example.invalid', recipient_phone: 'mock-phone', subject: 'Old reminder', message: 'Old message' }] })
    expect(await (await h.invoke('resend-notification', { notification_id: 'old' })).json()).toEqual(expect.objectContaining({ success: false, skipped: true, email_sent: false, sms_sent: false }))
    expect(h.send).not.toHaveBeenCalled()
    expect(h.mutations).not.toHaveBeenCalled()
  })
  it('new resends retain their recipient and subject', async () => {
    const h = harness({ notifications: [{ id: 'new', created_at: '2026-11-02T14:00:00Z', email_sent: false, sms_sent: true, recipient_email: 'test-caregiver@example.invalid', subject: 'New reminder', message: 'Existing message' }] })
    expect((await (await h.invoke('resend-notification', { notification_id: 'new' })).json()).email_sent).toBe(true)
    expect(h.send).toHaveBeenCalledTimes(1)
    expect(h.send.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ to: 'test-caregiver@example.invalid', subject: 'New reminder' }))
  })
  it('scheduler skips old creation notices without changing their flags', async () => {
    const h = harness({ nurse_assessments: [{ id: 'old', created_at: '2026-11-01T12:00:00Z', status: 'Pending', due_date: '2027-01-01', assessment_type: '618' }], nurses: [{ status: 'active', receives_618_notifications: true, email: 'test-caregiver@example.invalid' }] })
    expect((await h.invoke('nurse-assessment-scheduler', {})).status).toBe(200)
    expect(h.send).not.toHaveBeenCalled()
    expect(h.mutations.mock.calls.filter(([table, action, row]) => table === 'nurse_assessments' && action === 'update' && row.created_notification_sent_at)).toEqual([])
  })
  it('new creation notices still reach the configured recipient', async () => {
    const h = harness({ nurse_assessments: [{ id: 'new', created_at: '2026-11-02T14:00:00Z', status: 'Pending', due_date: '2027-01-01', assessment_type: '618' }], nurses: [{ status: 'active', receives_618_notifications: true, email: 'test-caregiver@example.invalid' }] })
    expect((await h.invoke('nurse-assessment-scheduler', {})).status).toBe(200)
    expect(h.send).toHaveBeenCalledTimes(1)
    expect(h.send.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ to: 'test-caregiver@example.invalid', idempotency_key: 'na-new-new-test-caregiver@example.invalid' }))
  })
  it('previously attempted creation and reminder flags are never retried', async () => {
    const due = new Date()
    due.setUTCDate(due.getUTCDate() + 14)
    const h = harness({ nurse_assessments: [{ id: 'attempted', created_at: '2026-11-02T14:00:00Z', status: 'Pending', due_date: due.toISOString().split('T')[0], assessment_type: '618', created_notification_sent_at: '2026-11-02T14:01:00Z', reminder_14_sent_at: '2026-11-02T14:01:00Z' }], nurses: [{ status: 'active', receives_618_notifications: true, email: 'test-caregiver@example.invalid' }] })
    expect((await h.invoke('nurse-assessment-scheduler', {})).status).toBe(200)
    expect(h.send).not.toHaveBeenCalled()
  })
  it.each([14, 7])('a new %i-day reminder on an older assessment keeps its scheduled window and recipient', async (days) => {
    const due = new Date()
    due.setUTCDate(due.getUTCDate() + days)
    const h = harness({ nurse_assessments: [{ id: 'existing', created_at: '2026-10-01T12:00:00Z', status: 'Pending', due_date: due.toISOString().split('T')[0], assessment_type: '618', created_notification_sent_at: '2026-10-01T12:01:00Z' }], nurses: [{ status: 'active', receives_618_notifications: true, email: 'test-caregiver@example.invalid' }] })
    expect((await h.invoke('nurse-assessment-scheduler', {})).status).toBe(200)
    expect(h.send).toHaveBeenCalledTimes(1)
    expect(h.send.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ to: 'test-caregiver@example.invalid', subject: `Reminder: a 618 assessment is due in ${days} days`, idempotency_key: `na-rem${days}-existing-test-caregiver@example.invalid` }))
  })
  it('old LMS assignments cannot be replayed', async () => {
    const h = harness({ user_roles: [{ user_id: 'mock-admin', role: 'admin' }], lms_assignments: [{ id: 'old', caregiver_id: 'test-only', created_at: '2026-11-01T12:00:00Z', caregivers: { email: 'test-caregiver@example.invalid' } }] })
    expect(await (await h.invoke('send-lms-assignment-notification', { assignment_ids: ['old'] })).json()).toEqual({ success: true, results: [] })
    expect(h.send).not.toHaveBeenCalled()
    expect(h.mutations).not.toHaveBeenCalled()
  })
  it('manual shifts cannot replay a historical appointment attempt', async () => {
    const h = harness({ appointments: [{ id: 'old-appointment', caregiver_id: 'test-only', end_time: '2026-11-01T12:00:00Z', caregivers: { email: 'test-caregiver@example.invalid' } }], notifications: [{ related_id: 'old-appointment', notification_type: 'shift_reminder_manual', created_at: '2026-11-01T12:00:00Z' }] })
    expect(await (await h.invoke('send-shift-reminders', { appointment_id: 'old-appointment' })).json()).toEqual({ sent: 0, skipped: 1, errors: [] })
    expect(h.send).not.toHaveBeenCalled()
    expect(h.mutations).not.toHaveBeenCalled()
  })
  it('Test-linked new notifications cannot be resent', async () => {
    const h = harness({ notifications: [{ id:'new', related_id:'synthetic-test', created_at:'2026-11-05T02:00:00Z', email_sent:false,sms_sent:true,recipient_email:'test-caregiver@example.invalid' }], test_records:[{id:'synthetic-test'}] });
    expect((await (await h.invoke('resend-notification',{notification_id:'new'})).json()).skipped).toBe(true);
    expect(h.send).not.toHaveBeenCalled(); expect(h.mutations).not.toHaveBeenCalled();
  })
  it('Test assessments are excluded from new creation notices and reminder windows', async () => {
    const due = new Date(); due.setUTCDate(due.getUTCDate()+14);
    const h=harness({nurse_assessments:[{id:'synthetic-test',clients:{status:'test'},created_at:'2026-11-05T02:00:00Z',status:'Pending',assessment_type:'618',due_date:due.toISOString().split('T')[0]}],nurses:[{status:'active',receives_618_notifications:true,email:'test-caregiver@example.invalid'}]});
    expect((await h.invoke('nurse-assessment-scheduler',{})).status).toBe(200);
    expect(h.send).not.toHaveBeenCalled(); expect(h.mutations).not.toHaveBeenCalled();
  })
  it('Test shifts are excluded from manual reminder sends',async()=>{
    const h=harness({appointments:[{id:'synthetic-test',clients:{status:'test'},caregivers:{email:'test-caregiver@example.invalid'}}]});
    expect(await (await h.invoke('send-shift-reminders',{appointment_id:'synthetic-test'})).json()).toEqual({sent:0,skipped:0,errors:[]});
    expect(h.send).not.toHaveBeenCalled();expect(h.mutations).not.toHaveBeenCalled();
  })
})
