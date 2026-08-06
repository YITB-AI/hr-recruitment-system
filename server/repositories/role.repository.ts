import { Role } from "@/models/Role";
import { userRepository } from "@/server/repositories/user.repository";
import { SYSTEM_ROLE_DEFAULTS, PERMISSION_ACTIONS, type PermissionAction } from "@/lib/auth/permissions";
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS, USER_ROLES } from "@/constants/user";

export type RoleRow = {
  key: string;
  name: string;
  description: string;
  permissions: PermissionAction[];
  isWildcard: boolean;
  isSystem: boolean;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): RoleRow {
  const rawPermissions = Array.isArray(row.permissions) ? (row.permissions as string[]) : [];
  return {
    key: row.key as string,
    name: row.name as string,
    description: (row.description as string | undefined) ?? "",
    permissions: rawPermissions.filter((p): p is PermissionAction => (PERMISSION_ACTIONS as readonly string[]).includes(p)),
    isWildcard: Boolean(row.isWildcard),
    isSystem: Boolean(row.isSystem),
    createdAt: row.createdAt as Date,
  };
}

export type CreateRoleInput = { key: string; name: string; description?: string; permissions: string[]; isWildcard?: boolean; createdBy?: string };
export type UpdateRoleInput = Partial<{ name: string; description: string; permissions: string[]; isWildcard: boolean }>;

// Lazy-seed, same convention as Setting's auto-create-on-first-read: the 4
// built-in roles (admin/hr/recruiter/interviewer) get inserted from their
// CURRENT hardcoded definition (lib/auth/permissions.ts's
// SYSTEM_ROLE_DEFAULTS) the first time anyone reads the Role collection --
// so shipping Dynamic RBAC changes zero behavior on day one; the Global
// Super Admin can then edit any of them going forward with no deploy.
let seedPromise: Promise<void> | null = null;
async function ensureSystemRolesSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const existing = await Role.countDocuments({ isSystem: true });
    if (existing > 0) return;
    await Role.insertMany(
      USER_ROLES.map((key) => {
        const allowed = SYSTEM_ROLE_DEFAULTS[key];
        return {
          key,
          name: USER_ROLE_LABELS[key],
          description: USER_ROLE_DESCRIPTIONS[key],
          permissions: allowed === "*" ? [] : Array.from(allowed),
          isWildcard: allowed === "*",
          isSystem: true,
        };
      }),
      { ordered: false },
    ).catch((error: unknown) => {
      // A duplicate-key error here means a concurrent request already won
      // the seed race -- not a real failure, the rows exist either way.
      if (!(error instanceof Error) || !error.message.includes("E11000")) throw error;
    });
  })();
  return seedPromise;
}

export const roleRepository = {
  async findAll(): Promise<RoleRow[]> {
    await ensureSystemRolesSeeded();
    const rows = await Role.find().sort({ isSystem: -1, name: 1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByKey(key: string): Promise<RoleRow | null> {
    await ensureSystemRolesSeeded();
    const row = await Role.findOne({ key: key.toLowerCase().trim() }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async existsByKey(key: string): Promise<boolean> {
    const row = await Role.findOne({ key: key.toLowerCase().trim() }).select("_id").lean();
    return row !== null;
  },
  /**
   * Single-role wildcard check for a raw role-key string that isn't the
   * current session (a different target user, or pre-session login time —
   * see lib/auth/permissions.ts's hasWildcardPermissions for the
   * session-resolved equivalent). Fails safe to false if the key doesn't
   * resolve to a real role, matching verifySessionToken's own fail-safe
   * default for an unresolvable role.
   */
  async isWildcardKey(key: string): Promise<boolean> {
    await ensureSystemRolesSeeded();
    const row = await Role.findOne({ key: key.toLowerCase().trim() }).select("isWildcard").lean<{ isWildcard?: boolean } | null>();
    return Boolean(row?.isWildcard);
  },
  /** Every currently-wildcard role's key, platform-wide. Role has a tiny expected cardinality (a handful of roles, not per-company), so this is a cheap way to answer "which of this company's users have full access" without a per-role loop. */
  async findWildcardKeys(): Promise<string[]> {
    await ensureSystemRolesSeeded();
    const rows = await Role.find({ isWildcard: true }).select("key").lean<Array<{ key: string }>>();
    return rows.map((r) => r.key);
  },
  async create(input: CreateRoleInput): Promise<RoleRow> {
    const doc = await Role.create({
      key: input.key.toLowerCase().trim(),
      name: input.name,
      description: input.description ?? "",
      permissions: input.permissions,
      isWildcard: input.isWildcard ?? false,
      isSystem: false,
      createdBy: input.createdBy,
    });
    return serialize(doc.toObject());
  },
  /** Never changes `key` or `isSystem` — a system role's identity/protection can't be edited away, only its name/description/permissions. */
  async update(key: string, input: UpdateRoleInput): Promise<RoleRow | null> {
    const row = await Role.findOneAndUpdate({ key: key.toLowerCase().trim() }, input, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  /** Throws with a clear, user-facing reason on either guard -- callers surface error.message directly. */
  async delete(key: string): Promise<void> {
    const normalized = key.toLowerCase().trim();
    const role = await Role.findOne({ key: normalized }).lean<RawRow | null>();
    if (!role) throw new Error("Role not found");
    if (role.isSystem) throw new Error("Built-in system roles can't be deleted");
    const usageCount = await userRepository.countByRoleGlobal(normalized);
    if (usageCount > 0) throw new Error(`This role is still assigned to ${usageCount} user${usageCount === 1 ? "" : "s"} — reassign them first`);
    await Role.deleteOne({ key: normalized });
  },
  countUsers: (key: string) => userRepository.countByRoleGlobal(key.toLowerCase().trim()),
};
