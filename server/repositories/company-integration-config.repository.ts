import { CompanyIntegrationConfig } from "@/models";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { WebhookAction } from "@/config/webhooks";

// UI-safe row — NEVER includes a decrypted secret or raw ciphertext, only
// booleans like hasSmtpPassword/connected. Plain (non-secret) fields like
// webhook URLs and sender name/email round-trip in full since they aren't
// sensitive; every "*Encrypted" field on the model is deliberately excluded
// here. Internal, secret-resolving reads (getWebhookUrl/getWebhookAuthHeaderValue/
// getResolvedEmailConfig below) are separate functions used only by
// lib/webhook.ts and the job-posting providers (Part 5) — never by the
// Settings UI.
export type CompanyIntegrationConfigRow = {
  _id: string;
  webhookUrls: Partial<Record<WebhookAction, string>>;
  hasWebhookAuthHeaderValue: boolean;
  email: {
    senderName: string | null;
    senderEmail: string | null;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    hasSmtpPassword: boolean;
  };
  linkedin: { organizationUrn: string | null };
  facebook: { appId: string | null; pageId: string | null; connected: boolean };
  x: { apiKey: string | null; connected: boolean };
  indeed: { feedEnabled: boolean };
};

type RawDoc = Record<string, unknown> & { _id: unknown };

function serialize(row: RawDoc): CompanyIntegrationConfigRow {
  const webhookUrls = (row.webhookUrls as Record<string, string> | undefined) ?? {};
  const email = (row.email as Record<string, unknown> | undefined) ?? {};
  const linkedin = (row.linkedin as Record<string, unknown> | undefined) ?? {};
  const facebook = (row.facebook as Record<string, unknown> | undefined) ?? {};
  const x = (row.x as Record<string, unknown> | undefined) ?? {};
  const indeed = (row.indeed as Record<string, unknown> | undefined) ?? {};

  return {
    _id: String(row._id),
    webhookUrls,
    hasWebhookAuthHeaderValue: Boolean(row.webhookAuthHeaderValueEncrypted),
    email: {
      senderName: (email.senderName as string | undefined) ?? null,
      senderEmail: (email.senderEmail as string | undefined) ?? null,
      smtpHost: (email.smtpHost as string | undefined) ?? null,
      smtpPort: (email.smtpPort as number | undefined) ?? null,
      smtpUser: (email.smtpUser as string | undefined) ?? null,
      hasSmtpPassword: Boolean(email.smtpPasswordEncrypted),
    },
    linkedin: { organizationUrn: (linkedin.organizationUrn as string | undefined) ?? null },
    facebook: {
      appId: (facebook.appId as string | undefined) ?? null,
      pageId: (facebook.pageId as string | undefined) ?? null,
      connected: Boolean(facebook.pageAccessTokenEncrypted),
    },
    x: {
      apiKey: (x.apiKey as string | undefined) ?? null,
      connected: Boolean(x.accessTokenEncrypted),
    },
    indeed: { feedEnabled: Boolean(indeed.feedEnabled) },
  };
}

// Auto-create-on-first-read, same convention as settingRepository.get —
// every company gets a real row lazily rather than a one-time migration.
async function getOrCreate(companyId: string) {
  const existing = await CompanyIntegrationConfig.findOne({ companyId });
  if (existing) return existing;
  try {
    return await CompanyIntegrationConfig.create({ companyId });
  } catch {
    // A concurrent request already created it — the unique companyId index
    // rejects the duplicate insert, which is fine, just refetch.
    const row = await CompanyIntegrationConfig.findOne({ companyId });
    if (!row) throw new Error("Failed to resolve company integration config");
    return row;
  }
}

export type UpdateWebhookConfigInput = {
  webhookUrls: Partial<Record<WebhookAction, string>>;
  // Secret — masked-edit convention: blank/omitted leaves the stored value
  // unchanged, only a real value overwrites it.
  webhookAuthHeaderValue?: string;
};

export type UpdateEmailConfigInput = {
  senderName?: string;
  senderEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  // Secret — same masked-edit convention as webhookAuthHeaderValue above.
  smtpPassword?: string;
};

export const companyIntegrationConfigRepository = {
  async get(companyId: string): Promise<CompanyIntegrationConfigRow> {
    const doc = await getOrCreate(companyId);
    return serialize(doc.toObject());
  },

  // --- Internal, secret-resolving reads — never expose these shapes to the UI ---
  async getWebhookUrl(companyId: string, action: WebhookAction): Promise<string | null> {
    const doc = await CompanyIntegrationConfig.findOne({ companyId })
      .select(`webhookUrls.${action}`)
      .lean<{ webhookUrls?: Partial<Record<WebhookAction, string>> } | null>();
    return doc?.webhookUrls?.[action] || null;
  },
  async getWebhookAuthHeaderValue(companyId: string): Promise<string | null> {
    const doc = await CompanyIntegrationConfig.findOne({ companyId })
      .select("webhookAuthHeaderValueEncrypted")
      .lean<{ webhookAuthHeaderValueEncrypted?: string } | null>();
    return doc?.webhookAuthHeaderValueEncrypted ? decryptSecret(doc.webhookAuthHeaderValueEncrypted) : null;
  },
  async getResolvedEmailConfig(companyId: string): Promise<{
    senderName: string | null;
    senderEmail: string | null;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPassword: string | null;
  } | null> {
    const doc = await CompanyIntegrationConfig.findOne({ companyId })
      .select("email")
      .lean<{ email?: Record<string, unknown> } | null>();
    if (!doc?.email) return null;
    const email = doc.email;
    return {
      senderName: (email.senderName as string | undefined) ?? null,
      senderEmail: (email.senderEmail as string | undefined) ?? null,
      smtpHost: (email.smtpHost as string | undefined) ?? null,
      smtpPort: (email.smtpPort as number | undefined) ?? null,
      smtpUser: (email.smtpUser as string | undefined) ?? null,
      smtpPassword: email.smtpPasswordEncrypted ? decryptSecret(email.smtpPasswordEncrypted as string) : null,
    };
  },

  // --- Writes (Settings UI) ---
  // Webhook URLs aren't secrets — they round-trip to the browser in full, so
  // a blank field means "clear this override" ($unset), not "leave
  // unchanged". Only the auth header value follows the masked-secret
  // convention (blank = leave unchanged).
  async updateWebhookConfig(companyId: string, input: UpdateWebhookConfigInput): Promise<CompanyIntegrationConfigRow> {
    await getOrCreate(companyId);
    const setOps: Record<string, unknown> = {};
    const unsetOps: Record<string, unknown> = {};
    for (const [action, url] of Object.entries(input.webhookUrls)) {
      const trimmed = url?.trim();
      if (trimmed) setOps[`webhookUrls.${action}`] = trimmed;
      else unsetOps[`webhookUrls.${action}`] = "";
    }
    if (input.webhookAuthHeaderValue?.trim()) {
      setOps.webhookAuthHeaderValueEncrypted = encryptSecret(input.webhookAuthHeaderValue.trim());
    }

    const update: Record<string, unknown> = {};
    if (Object.keys(setOps).length > 0) update.$set = setOps;
    if (Object.keys(unsetOps).length > 0) update.$unset = unsetOps;
    const doc = await CompanyIntegrationConfig.findOneAndUpdate({ companyId }, update, { returnDocument: "after" });
    return serialize(doc!.toObject());
  },
  async updateEmailConfig(companyId: string, input: UpdateEmailConfigInput): Promise<CompanyIntegrationConfigRow> {
    await getOrCreate(companyId);
    const setOps: Record<string, unknown> = {};
    const unsetOps: Record<string, unknown> = {};

    if (input.senderName?.trim()) setOps["email.senderName"] = input.senderName.trim();
    else unsetOps["email.senderName"] = "";
    if (input.senderEmail?.trim()) setOps["email.senderEmail"] = input.senderEmail.trim();
    else unsetOps["email.senderEmail"] = "";
    if (input.smtpHost?.trim()) setOps["email.smtpHost"] = input.smtpHost.trim();
    else unsetOps["email.smtpHost"] = "";
    if (input.smtpPort) setOps["email.smtpPort"] = input.smtpPort;
    else unsetOps["email.smtpPort"] = "";
    if (input.smtpUser?.trim()) setOps["email.smtpUser"] = input.smtpUser.trim();
    else unsetOps["email.smtpUser"] = "";
    // smtpPassword: masked-secret convention — blank leaves it unchanged,
    // deliberately no $unset branch (no "clear password" control in v1).
    if (input.smtpPassword?.trim()) setOps["email.smtpPasswordEncrypted"] = encryptSecret(input.smtpPassword.trim());

    const update: Record<string, unknown> = {};
    if (Object.keys(setOps).length > 0) update.$set = setOps;
    if (Object.keys(unsetOps).length > 0) update.$unset = unsetOps;
    const doc = await CompanyIntegrationConfig.findOneAndUpdate({ companyId }, update, { returnDocument: "after" });
    return serialize(doc!.toObject());
  },
};
