import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.4.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { convert } from 'npm:html-to-text@9.0.5'
import { sendWithEmailAudit } from './email-outcomes.ts'

// Existing notifications compose HTML at send time. Keep their content and
// envelope intact; only the transport changes. Never expose this to browsers.
const SITE_NAME = 'Home Care Headquarters'
const SENDER_DOMAIN = 'notify.homecareheadquarters.org'
const FROM_DOMAIN = SENDER_DOMAIN

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function notificationHtml(subject: string, html: string): string {
  const match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
  const heading = match
    ? match[1].replace(/<[^>]+>/g, '').trim()
    : subject.replace(/^[^\p{L}\p{N}]+/u, '').split(':')[0].trim() || 'Notification'
  const body = html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, '').trim()
  return `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="utf-8"></head><body style="background-color:#ffffff;font-family:Inter,Arial,sans-serif;color:#0f172a"><div style="display:none">${escapeHtml(subject)}</div><div style="max-width:600px;margin:0 auto;padding:24px 16px"><div style="background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);padding:28px 24px;border-radius:12px 12px 0 0"><h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">${escapeHtml(heading)}</h1></div><div style="background:#f9fafb;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><div style="font-size:15px;line-height:1.6;color:#0f172a">${body}</div><hr style="border-color:#e5e7eb;margin:20px 0"><p style="font-size:12px;color:#64748b;margin:8px 0">Home Care Headquarters &middot; <a href="mailto:support@homecareheadquarters.org" style="color:#2563eb;text-decoration:underline">support@homecareheadquarters.org</a></p></div></div></body></html>`
}

export async function sendAppEmail(
  to: string,
  subject: string,
  html: string,
  opts: { idempotencyKey?: string } = {},
): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey || !supabaseUrl || !serviceKey) return { success: false, error: 'Missing email configuration' }
  if (!to) return { success: false, error: 'Missing recipient' }

  const minuteBucket = Math.floor(Date.now() / 60000)
  const recipientTag = to.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40)
  const subjectTag = subject.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 60)
  const idempotencyKey = opts.idempotencyKey ?? `notify-${recipientTag}-${subjectTag}-${minuteBucket}`
  const store = createClient(supabaseUrl, serviceKey)
  try {
    const result = await sendWithEmailAudit(store, 'system-notification', to, async () => {
      const renderedHtml = notificationHtml(subject, html)
      try {
        await sendLovableEmail({
          to,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html: renderedHtml,
          text: convert(renderedHtml),
          purpose: 'transactional',
          label: 'system-notification',
          idempotency_key: idempotencyKey,
        }, { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') })
        return { sent: true }
      } catch (error) {
        if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
          return { sent: false, reason: 'recipient_suppressed' }
        }
        throw error
      }
    })
    return result.sent ? { success: true } : { success: false, error: result.reason }
  } catch (error) {
    // Existing jobs may continue to another recipient: respect the service's
    // cooldown before the loop's next attempt rather than hammering the API.
    if (error instanceof EmailAPIError && error.status === 429) {
      await new Promise(resolve => setTimeout(resolve, (error.retryAfterSeconds ?? 60) * 1000))
    }
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}