import { DocumentTemplate } from "@/models";
import type { TemplateFieldInput } from "@/validators/document-template";

export type DocumentTemplateRow = {
  _id: string;
  name: string;
  category: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  fields: TemplateFieldInput[];
  isActive: boolean;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): DocumentTemplateRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    category: row.category as string,
    description: (row.description as string | undefined) ?? null,
    fileName: row.fileName as string,
    fileUrl: row.fileUrl as string,
    fields: (row.fields as TemplateFieldInput[]) ?? [],
    isActive: row.isActive as boolean,
    createdAt: row.createdAt as Date,
  };
}

export type CreateTemplateInput = {
  name: string;
  category: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fields: TemplateFieldInput[];
};

export type UpdateTemplateInput = Partial<CreateTemplateInput> & { isActive?: boolean };

// Every function takes companyId first and filters by it — see the
// tenant-isolation comment in server/repositories/employee.repository.ts.
export const documentTemplateRepository = {
  async findAll(companyId: string): Promise<DocumentTemplateRow[]> {
    const rows = await DocumentTemplate.find({ companyId }).sort({ createdAt: -1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findById(companyId: string, id: string): Promise<DocumentTemplateRow | null> {
    const row = await DocumentTemplate.findOne({ _id: id, companyId }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async create(companyId: string, input: CreateTemplateInput): Promise<DocumentTemplateRow> {
    const doc = await DocumentTemplate.create({ ...input, companyId });
    return serialize(doc.toObject());
  },
  async update(companyId: string, id: string, input: UpdateTemplateInput): Promise<DocumentTemplateRow | null> {
    const row = await DocumentTemplate.findOneAndUpdate({ _id: id, companyId }, input, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async delete(companyId: string, id: string): Promise<DocumentTemplateRow | null> {
    const row = await DocumentTemplate.findOneAndDelete({ _id: id, companyId }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
};
