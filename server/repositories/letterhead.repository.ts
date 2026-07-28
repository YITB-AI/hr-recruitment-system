import { Letterhead } from "@/models";
import { DEFAULT_CONTENT_TOP_MARGIN_IN, DEFAULT_CONTENT_BOTTOM_MARGIN_IN } from "@/lib/docx-letterhead";

export type LetterheadRow = {
  _id: string;
  name: string;
  imageUrl: string;
  contentTopMarginIn: number;
  contentBottomMarginIn: number;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown };

// Falls back to the shared defaults for rows created before these fields
// existed — never a crash/blank value for a pre-existing letterhead.
function serialize(row: RawRow): LetterheadRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    imageUrl: row.imageUrl as string,
    contentTopMarginIn: (row.contentTopMarginIn as number | undefined) ?? DEFAULT_CONTENT_TOP_MARGIN_IN,
    contentBottomMarginIn: (row.contentBottomMarginIn as number | undefined) ?? DEFAULT_CONTENT_BOTTOM_MARGIN_IN,
    createdAt: row.createdAt as Date,
  };
}

export type CreateLetterheadInput = {
  companyId: string;
  name: string;
  imageUrl: string;
  contentTopMarginIn?: number;
  contentBottomMarginIn?: number;
  createdBy?: string;
};

export type UpdateLetterheadMarginsInput = {
  contentTopMarginIn: number;
  contentBottomMarginIn: number;
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
  async updateMargins(companyId: string, id: string, input: UpdateLetterheadMarginsInput): Promise<LetterheadRow | null> {
    const row = await Letterhead.findOneAndUpdate({ _id: id, companyId }, { $set: input }, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async delete(companyId: string, id: string): Promise<LetterheadRow | null> {
    const row = await Letterhead.findOneAndDelete({ _id: id, companyId }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
};
