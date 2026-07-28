import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ACTIVITY_ENTITY_TYPES = [
  "job",
  "applicant",
  "interview",
  "employee",
  "document",
  "setting",
  "auth",
  "user",
] as const;

const activityLogSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts for why
    // (staged multi-tenancy rollout, becomes required post-migration).
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, enum: ACTIVITY_ENTITY_TYPES, required: true, index: true },
    // Optional — a bulk/list-level action (e.g. exporting a filtered CSV of
    // many records) has no single natural entity to point at, the same
    // reasoning already applied to Notification's entityType/entityId for
    // the bulk-document-generation summary notification. Every entity-
    // specific write still supplies a real one; this only widens what a
    // NEW kind of write is allowed to omit.
    entityId: { type: Schema.Types.ObjectId },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

activityLogSchema.index({ createdAt: -1 });
// Compound indexes matching the repository's actual query shapes —
// findRecent/findAllPaginated filter {companyId} + sort(createdAt), and
// findByEntity filters {companyId, entityType, entityId} + sort(createdAt).
// The single-field indexes above can't serve either efficiently: Mongo
// would have to either scan every company's rows in createdAt order, or
// index-scan companyId and sort the results in memory.
activityLogSchema.index({ companyId: 1, createdAt: -1 });
activityLogSchema.index({ companyId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export type ActivityLogDoc = InferSchemaType<typeof activityLogSchema>;

export const ActivityLog: Model<ActivityLogDoc> =
  models.ActivityLog ?? model<ActivityLogDoc>("ActivityLog", activityLogSchema);
