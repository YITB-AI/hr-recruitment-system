import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { USER_ROLES } from "@/constants/user";

export { USER_ROLES };
export type { UserRole } from "@/constants/user";

const userSchema = new Schema(
  {
    // Required since Security Hardening Phase 4 — scripts/migrate-tenancy.ts
    // backfilled every existing row long ago and every write path has
    // supplied it since. The old global-unique `email` index is now the
    // compound `{companyId, email}` unique index below: the same email can
    // legitimately exist at two different client companies.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Not schema-enum-constrained to USER_ROLES anymore — that array is now
    // only the seed data for the 4 built-in system Roles (see models/Role.ts
    // + server/repositories/role.repository.ts). A role key can be any
    // Role.key the Global Super Admin has created, validated at the service
    // layer (roleRepository.findByKey), the same FK-existence pattern
    // already used for Department/EmployeeType — not a Mongoose enum.
    role: { type: String, default: "recruiter" },
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
    // Personal, per-category in-app notification preferences — distinct
    // from Setting.notifications' company-wide SMS/Email channel toggles.
    // A Map so new NotificationTypes added later don't need a migration;
    // a missing key defaults to enabled (see lib/staff-notify.ts).
    notificationPreferences: { type: Map, of: Boolean },
    // MFA (TOTP) — optional for hr/recruiter/interviewer, enforced for admin
    // (see actions/auth.ts's post-login redirect and app/(app)/mfa-setup).
    // mfaSecretEncrypted is written as soon as enrollment STARTS (see
    // lib/mfa.ts/actions/mfa.ts) but mfaEnabled only flips to true once the
    // user proves they actually captured it by entering one valid code —
    // an abandoned enrollment just leaves an unused encrypted secret behind,
    // overwritten by the next attempt. Backup codes are bcrypt-hashed and
    // single-use — spliced out of the array on redemption (see lib/mfa.ts).
    mfaEnabled: { type: Boolean, default: false },
    mfaSecretEncrypted: { type: String },
    mfaBackupCodeHashes: { type: [String], default: [] },
    mfaEnabledAt: { type: Date },
    // Set once, permanently, the first time an admin completes MFA
    // enrollment — unlike mfaEnabledAt, disableMfa never unsets this. It's
    // the one durable signal for "has this admin EVER finished setup,"
    // independent of whether MFA happens to be on right now. Required-MFA
    // enforcement (actions/auth.ts, app/(app)/layout.tsx) checks THIS field,
    // not mfaEnabled, so disabling MFA later never re-triggers the forced
    // setup flow — mirrors mustChangePassword's own one-time-nudge model.
    mfaSetupCompletedAt: { type: Date },
  },
  { timestamps: true },
);

// The same email can exist at two different client companies — uniqueness
// is scoped per-tenant, not global. Applying the index actually still
// requires scripts/migrate-user-email-index.ts's own separate `--confirm`
// run against production (Mongoose does not alter existing live indexes).
userSchema.index({ companyId: 1, email: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = models.User ?? model<UserDoc>("User", userSchema);
