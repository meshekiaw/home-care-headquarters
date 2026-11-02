import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.4.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { recordTerminalEmailEvent, type TerminalEmailEvent, type TerminalEmailType } from '../_shared/email-outcomes.ts'

async function recordEvent(type: TerminalEmailType, event: TerminalEmailEvent) {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) throw new Error('Email event storage unavailable')
  await recordTerminalEmailEvent(createClient(url, serviceKey), type, event)
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await recordEvent('email.bounced', event)
    },
    'email.complaint': async (event) => {
      await recordEvent('email.complaint', event)
    },
    'email.unsubscribed': async (event) => {
      await recordEvent('email.unsubscribed', event)
    },
  },
})

Deno.serve((req) => handler(req))
