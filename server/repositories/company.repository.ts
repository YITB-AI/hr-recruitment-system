import { Company, User, Job, type CompanyStatus } from "@/models";
import { escapeRegex } from "@/lib/regex";

export type CompanyRow = {
  _id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  logoUrl: string | null;
  createdAt: Date;
  legalName: string | null;
  industry: string | null;
  companySize: string | null;
  adminPhone: string | null;
  country: string | null;
  defaultLanguage: string;
  enabledFeatures: string[];
  featureAccessConfigured: boolean;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): CompanyRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as CompanyStatus,
    logoUrl: (row.logoUrl as string | undefined) ?? null,
    createdAt: row.createdAt as Date,
    legalName: (row.legalName as string | undefined) ?? null,
    industry: (row.industry as string | undefined) ?? null,
    companySize: (row.companySize as string | undefined) ?? null,
    adminPhone: (row.adminPhone as string | undefined) ?? null,
    country: (row.country as string | undefined) ?? null,
    defaultLanguage: (row.defaultLanguage as string | undefined) ?? "en",
    enabledFeatures: Array.isArray(row.enabledFeatures) ? (row.enabledFeatures as string[]) : [],
    featureAccessConfigured: Boolean(row.featureAccessConfigured),
  };
}

export type CreateCompanyInput = {
  name: string;
  slug: string;
  legalName?: string;
  industry?: string;
  companySize?: string;
  adminPhone?: string;
  country?: string;
  defaultLanguage?: string;
  enabledFeatures?: string[];
  featureAccessConfigured?: boolean;
};

export type UpdateCompanyInput = Partial<{ name: string; logoUrl: string; enabledFeatures: string[]; featureAccessConfigured: boolean }>;

export type CompanyListFilters = {
  search?: string;
  status?: CompanyStatus;
  page: number;
  pageSize: number;
};

export type CompanyListResult = { rows: CompanyRow[]; total: number };

export const companyRepository = {
  async findBySlug(slug: string): Promise<CompanyRow | null> {
    const row = await Company.findOne({ slug: slug.toLowerCase() }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async findById(id: string): Promise<CompanyRow | null> {
    const row = await Company.findById(id).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async findAll(): Promise<CompanyRow[]> {
    const rows = await Company.find().sort({ createdAt: -1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findRecent(limit: number): Promise<CompanyRow[]> {
    const rows = await Company.find().sort({ createdAt: -1 }).limit(limit).lean<RawRow[]>();
    return rows.map(serialize);
  },
  countTotal(): Promise<number> {
    return Company.countDocuments();
  },
  countByStatus(status: CompanyStatus): Promise<number> {
    return Company.countDocuments({ status });
  },
  countCreatedBetween(start: Date, end: Date): Promise<number> {
    return Company.countDocuments({ createdAt: { $gte: start, $lt: end } });
  },
  async findAllPaginated(filters: CompanyListFilters): Promise<CompanyListResult> {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const pattern = new RegExp(escapeRegex(filters.search.trim()), "i");
      query.$or = [{ name: pattern }, { slug: pattern }];
    }

    const [rows, total] = await Promise.all([
      Company.find(query)
        .sort({ createdAt: -1 })
        .skip((filters.page - 1) * filters.pageSize)
        .limit(filters.pageSize)
        .lean<RawRow[]>(),
      Company.countDocuments(query),
    ]);

    return { rows: rows.map(serialize), total };
  },
  async create(input: CreateCompanyInput): Promise<CompanyRow> {
    const doc = await Company.create(input);
    return serialize(doc.toObject());
  },
  async update(id: string, input: UpdateCompanyInput): Promise<CompanyRow | null> {
    const row = await Company.findByIdAndUpdate(id, input, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async setStatus(id: string, status: CompanyStatus): Promise<CompanyRow | null> {
    const row = await Company.findByIdAndUpdate(id, { status }, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async delete(id: string): Promise<void> {
    await Company.findByIdAndDelete(id);
  },
  countUsers(companyId: string): Promise<number> {
    return User.countDocuments({ companyId });
  },
  countJobs(companyId: string): Promise<number> {
    return Job.countDocuments({ companyId });
  },
};
