import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// One row per company. Every field is optional — a blank webhook URL means
// "fall back to the global env var default" (see config/webhooks.ts); a
// blank/absent social/email field means "not configured yet". Any field
// suffixed "Encrypted" stores ciphertext produced by lib/crypto.ts's
// encryptSecret() — never plaintext. See that file's header comment for the
// encryption scheme, and company-integration-config.repository.ts's own
// comment for the rule that decrypted secrets are NEVER included in the
// row type returned to the Settings UI.
const companyIntegrationConfigSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, unique: true, index: true },

    // Per-company override of each WebhookAction's destination URL (see
    // config/webhooks.ts's WEBHOOK_ENV_VAR map) — one optional field per
    // action, deliberately not a Map so the shape stays visible in the
    // schema and in any admin UI built against it.
    webhookUrls: {
      "send-email": { type: String, trim: true },
      "send-sms": { type: String, trim: true },
      "ai-call": { type: String, trim: true },
      "create-application": { type: String, trim: true },
      "send-account-email": { type: String, trim: true },
      "sync-jobs": { type: String, trim: true },
      "sync-all": { type: String, trim: true },
    },
    // Per-company override of the outbound webhook auth header's value —
    // the header NAME stays a global env var (N8N_WEBHOOK_AUTH_HEADER_NAME),
    // since that's an account-wide n8n convention, not something that varies
    // per client company.
    webhookAuthHeaderValueEncrypted: { type: String },

    // Threaded into the payload sent to n8n's send-email/send-account-email
    // webhooks — this app has no direct SMTP client of its own (email
    // transport is entirely n8n-delegated, see lib/email.ts), so these are
    // reference values for whatever email step that company's n8n workflow
    // uses, not consumed by a client in this codebase.
    email: {
      senderName: { type: String, trim: true },
      senderEmail: { type: String, trim: true },
      smtpHost: { type: String, trim: true },
      smtpPort: { type: Number },
      smtpUser: { type: String, trim: true },
      smtpPasswordEncrypted: { type: String },
    },

    // Job-posting / social-media provider config (lib/job-posting/*) — see
    // that directory's own comments for exactly how each platform's fields
    // are used; not all platforms need OAuth (Indeed is a pull-based feed).
    linkedin: {
      // No stored credentials — LinkedIn's real Job Postings API requires a
      // Talent Solutions/Recruiter System Connect partnership unavailable to
      // a self-serve OAuth app, so this integration only ever generates a
      // public share-intent URL. Field kept for a future partner-API path.
      organizationUrn: { type: String, trim: true },
    },
    facebook: {
      appId: { type: String, trim: true },
      appSecretEncrypted: { type: String },
      pageId: { type: String, trim: true },
      pageAccessTokenEncrypted: { type: String },
      tokenExpiresAt: { type: Date },
    },
    x: {
      apiKey: { type: String, trim: true },
      apiSecretEncrypted: { type: String },
      accessTokenEncrypted: { type: String },
      accessTokenSecretEncrypted: { type: String },
    },
    indeed: {
      // Pull-based (an XML feed Indeed's own crawler polls) — nothing
      // secret to store, just an enable toggle; the feed URL itself is
      // derived from the company's slug, not stored here.
      feedEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export type CompanyIntegrationConfigDoc = InferSchemaType<typeof companyIntegrationConfigSchema>;

export const CompanyIntegrationConfig: Model<CompanyIntegrationConfigDoc> =
  models.CompanyIntegrationConfig ?? model<CompanyIntegrationConfigDoc>("CompanyIntegrationConfig", companyIntegrationConfigSchema);
