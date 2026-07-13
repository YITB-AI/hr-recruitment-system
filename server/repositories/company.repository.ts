import { Company, type CompanyStatus } from "@/models";

export type CompanyRow = {
  _id: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): CompanyRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as CompanyStatus,
    createdAt: row.createdAt as Date,
  };
}

export type CreateCompanyInput = {
  name: string;
  slug: string;
};

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
  async create(input: CreateCompanyInput): Promise<CompanyRow> {
    const doc = await Company.create(input);
    return serialize(doc.toObject());
  },
};
