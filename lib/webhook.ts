import { getWebhookAuthHeader, type WebhookAction, getWebhookUrl } from "@/config/webhooks";
import type { WebhookResult } from "@/types/webhook";
import { companyRepository } from "@/server/repositories/company.repository";

const TIMEOUT_MS = 15_000;

// The caller's identity, merged into every outbound payload below — also
// the source of the companyId used to resolve a per-company webhook URL/
// auth header override (see config/webhooks.ts). Required, not optional:
// every real call site already has one (verified directly — the only
// exception was lib/email.ts's sendEmail(), which now takes an explicit
// companyId param and builds a minimal actor-like object itself). Making
// this required turns "you must resolve company context before calling
// this" into a compile-time check instead of an implicit convention.
export type WebhookActor = { id: string; name: string; companyId: string };

export async function triggerWebhook(
  action: WebhookAction,
  payload: Record<string, unknown>,
  actor: WebhookActor,
): Promise<WebhookResult> {
  let url: string;
  let authHeader: { name: string; value: string } | null;
  try {
    [url, authHeader] = await Promise.all([
      getWebhookUrl(action, actor.companyId),
      getWebhookAuthHeader(actor.companyId),
    ]);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers[authHeader.name] = authHeader.value;

  // companySlug is the human-readable company identifier (e.g.
  // "digital-auxilius") — added alongside whatever companyId value the
  // caller already put in `payload` (usually our internal ObjectId) because
  // n8n's MongoDB node compares ObjectId strings unreliably over HTTP.
  // Never used to REPLACE an existing companyId in a payload that a workflow
  // writes straight back into our database (e.g. create-application) — doing
  // so would break tenant isolation for anything n8n creates.
  const company = await companyRepository.findById(actor.companyId);
  const body = {
    ...payload,
    userId: actor.id === "system" ? null : actor.id,
    username: actor.name,
    companySlug: company?.slug ?? null,
  };

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
