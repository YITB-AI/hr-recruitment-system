import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const USER_ROLES = ["admin", "recruiter", "hr", "interviewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    // Optional for now, not required — Phase 1 (multi-tenancy foundation) is
    // being rolled out in stages so the live app never breaks mid-migration.
    // Becomes required once scripts/migrate-tenancy.ts has backfilled every
    // existing row and every write path supplies it (see the plan's Phase 1
    // sequencing). The old global-unique `email` index also becomes a
    // compound `{companyId, email}` unique index at that same point, once
    // every row actually has a companyId to make the compound index meaningful.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "recruiter" },
    title: { type: String, trim: true },
    avatarUrl: { type: String },
    // Brute-force protection: incremented on each failed login, reset to 0
    // on success. lockedUntil is set once failedLoginAttempts crosses the
    // threshold (see lib/auth/session.ts) and checked before a password
    // compare is even attempted.
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    // Set true when a company is provisioned (scripts/create-company.ts) or
    // an admin resets someone's password — forces a change on next login
    // rather than leaving an operator-known password live indefinitely.
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = models.User ?? model<UserDoc>("User", userSchema);
