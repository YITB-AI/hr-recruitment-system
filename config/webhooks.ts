export type WebhookAction = "send-email" | "send-sms";

const WEBHOOK_ENV_VAR: Record<WebhookAction, string> = {
  "send-email": "N8N_WEBHOOK_SEND_EMAIL",
  "send-sms": "N8N_WEBHOOK_SEND_SMS",
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
