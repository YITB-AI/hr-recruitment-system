import { GeneratedDocument } from "@/models";

export type GeneratedDocumentRow = {
  _id: string;
  fileName: string;
  fileUrl: string | null;
  status: string;
  createdAt: Date;
  template: { _id: string; name: string } | null;
  employee: { _id: string; name: string } | null;
  generatedBy: { _id: string; name: string } | null;
};

type RawRow = Record<string, unknown> & {
  _id: unknown;
  templateId: { _id: unknown; name: string } | null;
  employeeId: { _id: unknown; name: string } | null;
  generatedBy: { _id: unknown; name: string } | null;
};

function serialize(row: RawRow): GeneratedDocumentRow {
  return {
    _id: String(row._id),
    fileName: row.fileName as string,
    fileUrl: (row.fileUrl as string | undefined) ?? null,
    status: row.status as string,
    createdAt: row.createdAt as Date,
    template: row.templateId ? { _id: String(row.templateId._id), name: row.templateId.name } : null,
    employee: row.employeeId ? { _id: String(row.employeeId._id), name: row.employeeId.name } : null,
    generatedBy: row.generatedBy ? { _id: String(row.generatedBy._id), name: row.generatedBy.name } : null,
  };
}

export type CreateGeneratedDocumentInput = {
  templateId: string;
  employeeId?: string;
  applicantId?: string;
  fileName: string;
  fileUrl: string;
  generatedBy?: string;
};

export const generatedDocumentRepository = {
  async findRecent(limit = 20): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByEmployeeId(employeeId: string): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find({ employeeId })
      .sort({ createdAt: -1 })
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async create(input: CreateGeneratedDocumentInput): Promise<GeneratedDocumentRow> {
    const doc = await GeneratedDocument.create(input);
    const populated = await GeneratedDocument.findById(doc._id)
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow>();
    return serialize(populated!);
  },
  async delete(id: string) {
    return GeneratedDocument.findByIdAndDelete(id).lean();
  },
};
