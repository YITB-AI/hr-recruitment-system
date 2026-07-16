import { triggerWebhook } from "@/lib/webhook";

// Account/transactional email (OTP codes, welcome emails) — relayed through
// n8n like every other outbound integration in this app (see config/webhooks.ts's
// "send-account-email" action), instead of talking to a provider like Resend
// directly. Callers (features/profile/services/profile.service.ts,
// scripts/create-company.ts, etc.) only depend on this function's signature,
// not on how the email actually gets sent — swapping the transport here
// doesn't require touching any of them.

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  const result = await triggerWebhook("send-account-email", input);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
