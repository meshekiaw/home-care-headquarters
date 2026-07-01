// Send SMS via Twilio for pending notifications rows.
// Modes:
//  - { notification_id }  -> send that specific row
//  - { test_to, test_message? } -> send an ad-hoc test SMS (no DB update)
//  - {} or { batch: true } -> process all unsent SMS notifications of allowed types
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_TYPES = ['orientation_reminder', 'assessment_overdue', 'assessment_due_soon'];

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return '+' + trimmed.slice(1).replace(/\D/g, '');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}

async function sendTwilioSms(to: string, body: string): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: normalizePhone(to), From: TWILIO_FROM_NUMBER, Body: body }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data?.message || `Twilio HTTP ${res.status}` };
  }
  return { ok: true, sid: data.sid };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  // Ad-hoc test
  if (payload.test_to) {
    const result = await sendTwilioSms(payload.test_to, payload.test_message || 'Test SMS from Home Care Headquarters.');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.ok ? 200 : 500,
    });
  }

  // Load target rows
  let query = supabase
    .from('notifications')
    .select('id, notification_type, recipient_phone, message, sms_sent')
    .eq('sms_sent', false)
    .not('recipient_phone', 'is', null)
    .in('notification_type', ALLOWED_TYPES);

  if (payload.notification_id) query = query.eq('id', payload.notification_id);

  const { data: rows, error } = await query.limit(50);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }

  const results: any[] = [];
  for (const row of rows || []) {
    const send = await sendTwilioSms(row.recipient_phone!, row.message || '');
    if (send.ok) {
      await supabase.from('notifications').update({
        sms_sent: true, sms_sent_at: new Date().toISOString(), error_message: null,
      }).eq('id', row.id);
      results.push({ id: row.id, ok: true, sid: send.sid });
    } else {
      await supabase.from('notifications').update({ error_message: send.error }).eq('id', row.id);
      results.push({ id: row.id, ok: false, error: send.error });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
  });
});
