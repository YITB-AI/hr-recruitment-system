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
    entityId: { type: Schema.Types.ObjectId, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

activityLogSchema.index({ createdAt: -1 });

export type ActivityLogDoc = InferSchemaType<typeof activityLogSchema>;

export const ActivityLog: Model<ActivityLogDoc> =
  models.ActivityLog ?? model<ActivityLogDoc>("ActivityLog", activityLogSchema);
