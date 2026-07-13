import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

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
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;

export const Notification: Model<NotificationDoc> =
  models.Notification ?? model<NotificationDoc>("Notification", notificationSchema);
