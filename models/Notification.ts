import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ACTIVITY_ENTITY_TYPES } from "./ActivityLog";
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from "@/constants/notification";

export const NOTIFICATION_CHANNELS = ["email", "sms", "push", "in_app"] as const;

const notificationSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, default: "in_app" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    // "required" only constrains NEW writes — rows created before this field
    // existed keep no `type`/`priority` at all; every read path defaults a
    // missing type -> "system" and priority -> "normal" in the repository
    // serializer, no migration script needed.
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    priority: { type: String, enum: NOTIFICATION_PRIORITIES, default: "normal" },
    // Mirrors ActivityLog's entityType/entityId convention exactly, rather
    // than a parallel shape — same idea (generic "what this is about" link).
    entityType: { type: String, enum: ACTIVITY_ENTITY_TYPES },
    entityId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;

export const Notification: Model<NotificationDoc> =
  models.Notification ?? model<NotificationDoc>("Notification", notificationSchema);
