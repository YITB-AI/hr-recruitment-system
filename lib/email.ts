import { triggerWebhook } from "@/lib/webhook";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";

// Account/transactional email (OTP codes, welcome emails) — relayed through
// n8n like every other outbound integration in this app (see config/webhooks.ts's
// "send-account-email" action), instead of talking to a provider like Resend
// directly. Callers (features/profile/services/profile.service.ts,
// scripts/create-company.ts, etc.) only depend on this function's signature,
// not on how the email actually gets sent — swapping the transport here
// doesn't require touching any of them.

export type SendEmailResult = { ok: true } | { ok: false; error: string };

// companyId is required (not threaded through a full session actor, since
// several callers — scripts/create-company.ts, createCompany itself — send
// on behalf of a company with no acting user session, or a DIFFERENT
// company than the caller's own) — see each call site's comment for why.
export async function sendEmail(
  input: { to: string; subject: string; html: string },
  companyId: string,
): Promise<SendEmailResult> {
  const emailConfig = await companyIntegrationConfigRepository.getResolvedEmailConfig(companyId);
  const result = await triggerWebhook(
    "send-account-email",
    {
      ...input,
      senderName: emailConfig?.senderName ?? null,
      senderEmail: emailConfig?.senderEmail ?? null,
    },
    { id: "system", name: "System", companyId },
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
