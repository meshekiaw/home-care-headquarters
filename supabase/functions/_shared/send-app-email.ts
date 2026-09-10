// Shared sender for background notification emails.
// Routes every send through the project's own email queue
// (send-transactional-email -> pgmq -> process-email-queue), so mail is sent
// from the verified sender domain with retries, logging and suppression.

function stripHeading(html: string): string {
  return html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, "").trim();
}

function deriveHeading(subject: string, html: string): string {
  const match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (match) return match[1].replace(/<[^>]+>/g, "").trim();
  return subject.replace(/^[^\p{L}\p{N}]+/u, "").split(":")[0].trim() || "Notification";
}

export async function sendAppEmail(
  to: string,
  subject: string,
  html: string,
  opts: { idempotencyKey?: string } = {},
): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return { success: false, error: "Missing Supabase configuration" };
  }
  if (!to) {
    return { success: false, error: "Missing recipient" };
  }

  const minuteBucket = Math.floor(Date.now() / 60000);
  const recipientTag = to.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40);
  const subjectTag = subject.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60);
  const idempotencyKey =
    opts.idempotencyKey ?? `notify-${recipientTag}-${subjectTag}-${minuteBucket}`;

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        templateName: "system-notification",
        recipientEmail: to,
        idempotencyKey,
        templateData: {
          subject,
          heading: deriveHeading(subject, html),
          bodyHtml: stripHeading(html),
          supportEmail: "support@homecareheadquarters.org",
        },
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error(`sendAppEmail failed ${resp.status}: ${text.slice(0, 300)}`);
      return { success: false, error: `${resp.status}: ${text.slice(0, 300)}` };
    }
    return { success: true };
  } catch (error) {
    console.error("sendAppEmail exception:", error);
    return { success: false, error: String(error) };
  }
}
