import { Letterhead } from "@/models";

export type LetterheadRow = {
  _id: string;
  name: string;
  imageUrl: string;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): LetterheadRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    imageUrl: row.imageUrl as string,
    createdAt: row.createdAt as Date,
  };
}

export type CreateLetterheadInput = {
  companyId: string;
  name: string;
  imageUrl: string;
  createdBy?: string;
};

export const letterheadRepository = {
  async findAllForCompany(companyId: string): Promise<LetterheadRow[]> {
    const rows = await Letterhead.find({ companyId }).sort({ createdAt: 1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findById(companyId: string, id: string): Promise<LetterheadRow | null> {
    const row = await Letterhead.findOne({ _id: id, companyId }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async create(input: CreateLetterheadInput): Promise<LetterheadRow> {
    const doc = await Letterhead.create(input);
    return serialize(doc.toObject());
  },
  async delete(companyId: string, id: string): Promise<LetterheadRow | null> {
    const row = await Letterhead.findOneAndDelete({ _id: id, companyId }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
};
