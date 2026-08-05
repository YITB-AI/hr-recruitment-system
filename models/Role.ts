import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Global, not per-company — a Role is a platform-wide template the Global
// Super Admin defines from the Platform workspace (see
// features/platform/services/role-management.service.ts); a company's own
// admin then just ASSIGNS one of these to a user (existing Users & Roles
// Settings tab), the same shape as before this shipped, just sourced from
// this collection instead of the 4 hardcoded strings in constants/user.ts.
//
// `permissions` is unconstrained [String] at the schema level (validated
// against the live PERMISSION_ACTIONS list at the service layer, same
// convention as Company.enabledFeatures) rather than a Mongoose enum, so
// adding a new permission action never requires a migration here.
//
// `isWildcard` represents admin's historical "*" (every action, including
// ones added later) — a static permissions array can't express "all
// current AND future actions", so this is a distinct boolean, not just a
// permissions array containing every currently-known key.
const roleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    permissions: { type: [String], default: [] },
    isWildcard: { type: Boolean, default: false },
    // Seeded system roles (admin/hr/recruiter/interviewer) can have their
    // permissions edited like any other role (that's the whole point of
    // Dynamic RBAC replacing the old hardcoded matrix) but can never be
    // deleted or have their `key` changed -- every existing User.role
    // value across every company points at one of these keys, and
    // repurposing/removing one out from under them would silently strand
    // those users with no resolvable role.
    isSystem: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type RoleDoc = InferSchemaType<typeof roleSchema>;

export const Role: Model<RoleDoc> = models.Role ?? model<RoleDoc>("Role", roleSchema);
