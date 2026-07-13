import { User, type UserRole } from "@/models";

export type UserRow = { _id: string; name: string; title: string | null };

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
};
