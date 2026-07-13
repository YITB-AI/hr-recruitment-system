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
};
