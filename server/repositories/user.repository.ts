import { User, type UserRole } from "@/models";

export type UserRow = { _id: string; name: string; title: string | null };

export type OwnProfileRow = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string | null;
  department: string | null;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  pendingEmail: string | null;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

type RawProfileRow = Record<string, unknown> & { _id: unknown };

function serializeOwnProfile(row: RawProfileRow): OwnProfileRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
    title: (row.title as string | undefined) ?? null,
    department: (row.department as string | undefined) ?? null,
    phone: (row.phone as string | undefined) ?? null,
    avatarUrl: (row.avatarUrl as string | undefined) ?? null,
    emailVerified: Boolean(row.emailVerified),
    pendingEmail: (row.pendingEmail as string | undefined) ?? null,
    lockedUntil: (row.lockedUntil as Date | undefined) ?? null,
    lastLoginAt: (row.lastLoginAt as Date | undefined) ?? null,
    createdAt: row.createdAt as Date,
  };
}

const OWN_PROFILE_FIELDS =
  "name email role title department phone avatarUrl emailVerified pendingEmail lockedUntil lastLoginAt createdAt";

export type CompanyUserRow = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: Date;
};

type RawCompanyUserRow = Record<string, unknown> & { _id: unknown };

function serializeCompanyUser(row: RawCompanyUserRow): CompanyUserRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
    mustChangePassword: Boolean(row.mustChangePassword),
    createdAt: row.createdAt as Date,
  };
}

export type CreateCompanyUserInput = {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  mustChangePassword: boolean;
};

export type UpdateCompanyUserInput = Partial<{ name: string; role: UserRole }>;

// Every function takes companyId first and filters by it — see the
// tenant-isolation comment in server/repositories/employee.repository.ts.
export const userRepository = {
  /** Minimal shape for pickers (e.g. interviewer selection). */
  async findAll(companyId: string): Promise<UserRow[]> {
    const rows = await User.find({ companyId })
      .select("name title")
      .lean<Array<{ _id: unknown; name: string; title?: string }>>();
    return rows.map((row) => ({ _id: String(row._id), name: row.name, title: row.title ?? null }));
  },
  /** Full-ish shape for the admin-only Users management screen. */
  async findAllForCompany(companyId: string): Promise<CompanyUserRow[]> {
    const rows = await User.find({ companyId })
      .select("name email role mustChangePassword createdAt")
      .sort({ createdAt: 1 })
      .lean<RawCompanyUserRow[]>();
    return rows.map(serializeCompanyUser);
  },
  async findById(companyId: string, id: string): Promise<CompanyUserRow | null> {
    const row = await User.findOne({ _id: id, companyId })
      .select("name email role mustChangePassword createdAt")
      .lean<RawCompanyUserRow | null>();
    return row ? serializeCompanyUser(row) : null;
  },
  async findByEmail(email: string): Promise<{ _id: string } | null> {
    const row = await User.findOne({ email: email.toLowerCase().trim() }).select("_id").lean<{ _id: unknown } | null>();
    return row ? { _id: String(row._id) } : null;
  },
  countByRole(companyId: string, role: UserRole): Promise<number> {
    return User.countDocuments({ companyId, role });
  },
  async create(companyId: string, input: CreateCompanyUserInput): Promise<CompanyUserRow> {
    const doc = await User.create({
      companyId,
      name: input.name,
      email: input.email.toLowerCase().trim(),
      role: input.role,
      passwordHash: input.passwordHash,
      mustChangePassword: input.mustChangePassword,
    });
    return serializeCompanyUser(doc.toObject());
  },
  async update(companyId: string, id: string, input: UpdateCompanyUserInput): Promise<CompanyUserRow | null> {
    const row = await User.findOneAndUpdate({ _id: id, companyId }, input, { returnDocument: "after" })
      .select("name email role mustChangePassword createdAt")
      .lean<RawCompanyUserRow | null>();
    return row ? serializeCompanyUser(row) : null;
  },
  async delete(companyId: string, id: string): Promise<void> {
    await User.findOneAndDelete({ _id: id, companyId });
  },

  async findOwnProfile(companyId: string, id: string): Promise<OwnProfileRow | null> {
    const row = await User.findOne({ _id: id, companyId }).select(OWN_PROFILE_FIELDS).lean<RawProfileRow | null>();
    return row ? serializeOwnProfile(row) : null;
  },
  /** Includes the password hash — only for actions that must re-verify it (password/email change). */
  findWithPasswordHash(companyId: string, id: string) {
    return User.findOne({ _id: id, companyId });
  },
  async updateOwnProfile(
    companyId: string,
    id: string,
    input: Partial<{ name: string; phone: string; avatarUrl: string }>,
  ): Promise<OwnProfileRow | null> {
    const row = await User.findOneAndUpdate({ _id: id, companyId }, input, { returnDocument: "after" })
      .select(OWN_PROFILE_FIELDS)
      .lean<RawProfileRow | null>();
    return row ? serializeOwnProfile(row) : null;
  },
  /** Global — email uniqueness isn't yet scoped to companyId (staged rollout, see models/User.ts). */
  async isEmailTaken(email: string, excludeUserId: string): Promise<boolean> {
    const count = await User.countDocuments({ email: email.toLowerCase().trim(), _id: { $ne: excludeUserId } });
    return count > 0;
  },
  async setPendingEmailChange(
    companyId: string,
    id: string,
    input: { pendingEmail: string; codeHash: string; expiresAt: Date },
  ): Promise<void> {
    await User.updateOne(
      { _id: id, companyId },
      {
        pendingEmail: input.pendingEmail,
        emailVerificationCodeHash: input.codeHash,
        emailVerificationExpiresAt: input.expiresAt,
        emailVerificationAttempts: 0,
        emailVerificationSentAt: new Date(),
      },
    );
  },
  async touchEmailVerificationResend(companyId: string, id: string, codeHash: string, expiresAt: Date): Promise<void> {
    await User.updateOne(
      { _id: id, companyId },
      { emailVerificationCodeHash: codeHash, emailVerificationExpiresAt: expiresAt, emailVerificationSentAt: new Date() },
    );
  },
  async incrementEmailVerificationAttempts(companyId: string, id: string): Promise<void> {
    await User.updateOne({ _id: id, companyId }, { $inc: { emailVerificationAttempts: 1 } });
  },
  async clearPendingEmailChange(companyId: string, id: string): Promise<void> {
    await User.updateOne(
      { _id: id, companyId },
      {
        $unset: {
          pendingEmail: "",
          emailVerificationCodeHash: "",
          emailVerificationExpiresAt: "",
          emailVerificationSentAt: "",
        },
        emailVerificationAttempts: 0,
      },
    );
  },
  async confirmEmailChange(companyId: string, id: string, newEmail: string): Promise<void> {
    await User.updateOne(
      { _id: id, companyId },
      {
        email: newEmail,
        emailVerified: true,
        $unset: {
          pendingEmail: "",
          emailVerificationCodeHash: "",
          emailVerificationExpiresAt: "",
          emailVerificationSentAt: "",
        },
        emailVerificationAttempts: 0,
      },
    );
  },
  async findAdminsForCompany(companyId: string, excludeUserId: string): Promise<Array<{ _id: string; email: string }>> {
    const rows = await User.find({ companyId, role: "admin", _id: { $ne: excludeUserId } })
      .select("email")
      .lean<Array<{ _id: unknown; email: string }>>();
    return rows.map((row) => ({ _id: String(row._id), email: row.email }));
  },
};
