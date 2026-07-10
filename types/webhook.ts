export type WebhookResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };
