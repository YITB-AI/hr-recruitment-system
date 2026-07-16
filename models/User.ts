import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { USER_ROLES } from "@/constants/user";

export { USER_ROLES };
export type { UserRole } from "@/constants/user";

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
    department: { type: String, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    lastLoginAt: { type: Date },
    // Existing users predate this flow and were provisioned by an admin, not
    // self-registered — treated as verified from day one. New/changed emails
    // (see pending* fields below) start unverified until the code is confirmed.
    emailVerified: { type: Boolean, default: true },
    // Secure email-change flow: the new address is staged here (never
    // written to `email` directly) until its one-time code is confirmed —
    // see features/profile/services/profile.service.ts.
    pendingEmail: { type: String, lowercase: true, trim: true },
    emailVerificationCodeHash: { type: String },
    emailVerificationExpiresAt: { type: Date },
    emailVerificationAttempts: { type: Number, default: 0 },
    emailVerificationSentAt: { type: Date },
    // Rolling 24h send-quota (separate from the 60s resend cooldown above):
    // caps how many verification codes can be *requested* in a day, not how
    // many times one can be guessed — see MAX_VERIFICATION_SENDS_PER_WINDOW
    // in features/profile/services/profile.service.ts.
    emailVerificationSendCount: { type: Number, default: 0 },
    emailVerificationSendWindowStartAt: { type: Date },
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
    // Distinct from role "admin" — role "admin" only manages their OWN
    // company (users, settings). isPlatformAdmin is a Digital-Auxilius-only
    // capability that crosses company boundaries: creating new companies and
    // assigning n8n-sourced jobs with no companyId to a company. A regular
    // client company's admin must never be able to set this on themselves —
    // it's set only via scripts/create-company.ts's own operator (never
    // exposed on the company-creation form) or directly in the database.
    isPlatformAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = models.User ?? model<UserDoc>("User", userSchema);
