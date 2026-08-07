import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Cross-tenant error aggregation for the Global Super Admin dashboard's
// error count — distinct from ActivityLog (which is a per-company audit
// trail of successful/attempted actions, always scoped for a company's own
// admins to read back). This collection exists specifically so a platform
// operator can see "how many things are failing across every company" in
// one place, without ever exposing one company's failures to another.
export const PLATFORM_ERROR_SOURCES = [
  "webhook.ai-call",
  "webhook.repair-data",
  "data-repair.auto-heal",
  "server-action",
  "api-route",
  "calendar.sync",
] as const;

const platformErrorLogSchema = new Schema(
  {
    // Absent when the error happened before any tenant could be resolved
    // (e.g. a webhook auth failure, a malformed request with no
    // identifiable company) — same "optional, fail-closed" reasoning as
    // ActivityLog.companyId.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    source: { type: String, enum: PLATFORM_ERROR_SOURCES, required: true, index: true },
    // A free-form label for where inside `source` this happened (e.g. the
    // route path or service function name) — not an enum, since the set of
    // call sites grows over time and shouldn't require a schema change.
    action: { type: String, trim: true },
    message: { type: String, required: true },
    stack: { type: String },
    // Arbitrary structured context (request id, entity id, etc.) — kept
    // schemaless on purpose, this is a diagnostic log, not queried by its
    // contents beyond company/source/time.
    context: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

platformErrorLogSchema.index({ createdAt: -1 });
platformErrorLogSchema.index({ companyId: 1, createdAt: -1 });

export type PlatformErrorLogDoc = InferSchemaType<typeof platformErrorLogSchema>;

export const PlatformErrorLog: Model<PlatformErrorLogDoc> =
  models.PlatformErrorLog ?? model<PlatformErrorLogDoc>("PlatformErrorLog", platformErrorLogSchema);
