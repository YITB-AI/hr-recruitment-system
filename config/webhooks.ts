export type WebhookAction =
  | "send-email"
  | "send-sms"
  | "ai-call"
  | "create-application"
  | "send-account-email"
  | "sync-jobs"
  | "sync-all";

const WEBHOOK_ENV_VAR: Record<WebhookAction, string> = {
  "send-email": "N8N_WEBHOOK_SEND_EMAIL",
  "send-sms": "N8N_WEBHOOK_SEND_SMS",
  "ai-call": "N8N_WEBHOOK_AI_CALL",
  "create-application": "N8N_WEBHOOK_CREATE_APPLICATION",
  // Deliberately separate from "send-email" above — that one carries
  // applicant-shaped fields (applicantId, jobTitle, template, interview
  // details) for a totally different n8n workflow. This one is a plain
  // {to, subject, html} transactional email (OTP codes, welcome emails) —
  // see lib/email.ts.
  "send-account-email": "N8N_WEBHOOK_SEND_ACCOUNT_EMAIL",
  // Triggered from the Jobs page's "Sync Jobs"/"Sync All" buttons — n8n
  // pulls fresh job (and, for sync-all, other) data from the external
  // source and writes it directly into MongoDB, same as the existing
  // n8n-authored Job pipeline. Only companyId is sent; n8n resolves
  // everything else on its side.
  "sync-jobs": "N8N_WEBHOOK_SYNC_JOBS",
  "sync-all": "N8N_WEBHOOK_SYNC_ALL",
};

export function getWebhookUrl(action: WebhookAction): string {
  const envVar = WEBHOOK_ENV_VAR[action];
  const url = process.env[envVar];

  if (!url) {
    throw new Error(
      `${envVar} is not set. Add your n8n Cloud webhook URL for "${action}" to .env.local.`,
    );
  }

  return url;
}

export function getWebhookAuthHeader(): { name: string; value: string } | null {
  const name = process.env.N8N_WEBHOOK_AUTH_HEADER_NAME;
  const value = process.env.N8N_WEBHOOK_AUTH_HEADER_VALUE;
  return name && value ? { name, value } : null;
}

// The reverse direction: n8n calling BACK into this app (app/api/webhooks/ai-call)
// to report call progress/outcome. Separate secret from the outbound auth
// header above — that one authenticates us to n8n, this one authenticates
// n8n to us.
export function getInboundWebhookSecret(): string | null {
  return process.env.N8N_WEBHOOK_CALLBACK_SECRET || null;
}
