import { getWebhookAuthHeader, type WebhookAction, getWebhookUrl } from "@/config/webhooks";
import type { WebhookResult } from "@/types/webhook";
import { companyRepository } from "@/server/repositories/company.repository";

const TIMEOUT_MS = 15_000;

// The caller's identity, merged into every outbound payload below. Optional
// so webhooks with no real session behind them (e.g. lib/email.ts's
// send-account-email, fired during OTP/pre-login flows) can skip it.
export type WebhookActor = { id: string; name: string; companyId: string };

export async function triggerWebhook(
  action: WebhookAction,
  payload: Record<string, unknown>,
  actor?: WebhookActor,
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

  // companySlug is the human-readable company identifier (e.g.
  // "digital-auxilius") — added alongside whatever companyId value the
  // caller already put in `payload` (usually our internal ObjectId) because
  // n8n's MongoDB node compares ObjectId strings unreliably over HTTP.
  // Never used to REPLACE an existing companyId in a payload that a workflow
  // writes straight back into our database (e.g. create-application) — doing
  // so would break tenant isolation for anything n8n creates.
  let body = payload;
  if (actor) {
    const company = await companyRepository.findById(actor.companyId);
    body = {
      ...payload,
      userId: actor.id === "system" ? null : actor.id,
      username: actor.name,
      companySlug: company?.slug ?? null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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
