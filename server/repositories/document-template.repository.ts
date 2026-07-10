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

export const documentTemplateRepository = {
  async findAll(): Promise<DocumentTemplateRow[]> {
    const rows = await DocumentTemplate.find().sort({ createdAt: -1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findById(id: string): Promise<DocumentTemplateRow | null> {
    const row = await DocumentTemplate.findById(id).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async create(input: CreateTemplateInput): Promise<DocumentTemplateRow> {
    const doc = await DocumentTemplate.create(input);
    return serialize(doc.toObject());
  },
  async update(id: string, input: UpdateTemplateInput): Promise<DocumentTemplateRow | null> {
    const row = await DocumentTemplate.findByIdAndUpdate(id, input, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async delete(id: string): Promise<DocumentTemplateRow | null> {
    const row = await DocumentTemplate.findByIdAndDelete(id).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
};
