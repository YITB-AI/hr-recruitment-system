export type WebhookAction =
  | "send-email"
  | "send-sms"
  | "send-verification-email"
  | "notify-admin-email-change"
  | "ai-call";

const WEBHOOK_ENV_VAR: Record<WebhookAction, string> = {
  "send-email": "N8N_WEBHOOK_SEND_EMAIL",
  "send-sms": "N8N_WEBHOOK_SEND_SMS",
  "send-verification-email": "N8N_WEBHOOK_SEND_VERIFICATION_EMAIL",
  "notify-admin-email-change": "N8N_WEBHOOK_NOTIFY_ADMIN_EMAIL_CHANGE",
  "ai-call": "N8N_WEBHOOK_AI_CALL",
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
