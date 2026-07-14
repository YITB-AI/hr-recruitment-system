import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// A logged-in device/session. The raw session token only ever lives in the
// user's httpOnly cookie — this collection stores its SHA-256 hash, so a
// leaked DB read can never be replayed as a live session. Session/device
// management + "logout everywhere" (see lib/auth/session.ts,
// server/repositories/session.repository.ts) work by querying/deleting rows
// here, not by decoding a JWT.
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    lastActiveAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    // Set only on a session created via admin impersonation (see
    // lib/auth/impersonation.ts) — the admin who is "driving" this session.
    // Never set on a normal login session.
    impersonatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;

export const UserSession: Model<SessionDoc> = models.UserSession ?? model<SessionDoc>("UserSession", sessionSchema);
