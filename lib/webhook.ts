import { getWebhookAuthHeader, type WebhookAction, getWebhookUrl } from "@/config/webhooks";
import type { WebhookResult } from "@/types/webhook";

const TIMEOUT_MS = 15_000;

export async function triggerWebhook(
  action: WebhookAction,
  payload: Record<string, unknown>,
): Promise<WebhookResult> {
  let url: string;
  try {
    url = getWebhookUrl(action);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authHeader = getWebhookAuthHeader();
  if (authHeader) headers[authHeader.name] = authHeader.value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      return { ok: false, error: `n8n webhook responded with ${response.status}` };
    }

    return { ok: true, data };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "n8n webhook timed out"
        : error instanceof Error
          ? error.message
          : "Unknown webhook error";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
