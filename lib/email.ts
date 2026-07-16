import { Resend } from "resend";

// Direct email delivery (OTP codes, admin notifications) — separate from
// lib/webhook.ts's triggerWebhook, which relays to n8n for applicant-facing
// communication (send-email/send-sms/ai-call). This one talks straight to
// Resend, no n8n involved, per the user's explicit choice for the email
// verification flow.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "HR Platform <onboarding@resend.dev>";

let client: Resend | null = null;
function getClient(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set. Add your Resend API key to .env.local.");
  client = new Resend(apiKey);
  return client;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  try {
    const resend = getClient();
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown email error" };
  }
}
