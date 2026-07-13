import { GeneratedDocument, GENERATED_DOCUMENT_STATUSES } from "@/models";

export type GeneratedDocumentStatus = (typeof GENERATED_DOCUMENT_STATUSES)[number];

export type GeneratedDocumentRow = {
  _id: string;
  fileName: string;
  fileUrl: string | null;
  status: string;
  batchId: string | null;
  createdAt: Date;
  template: { _id: string; name: string } | null;
  employee: { _id: string; name: string } | null;
  applicant: { _id: string; name: string } | null;
  generatedBy: { _id: string; name: string } | null;
};

type RawRow = Record<string, unknown> & {
  _id: unknown;
  templateId: { _id: unknown; name: string } | null;
  employeeId: { _id: unknown; name: string } | null;
  applicantId: { _id: unknown; name: string } | null;
  generatedBy: { _id: unknown; name: string } | null;
};

function serialize(row: RawRow): GeneratedDocumentRow {
  return {
    _id: String(row._id),
    fileName: row.fileName as string,
    fileUrl: (row.fileUrl as string | undefined) ?? null,
    status: row.status as string,
    batchId: (row.batchId as string | undefined) ?? null,
    createdAt: row.createdAt as Date,
    template: row.templateId ? { _id: String(row.templateId._id), name: row.templateId.name } : null,
    employee: row.employeeId ? { _id: String(row.employeeId._id), name: row.employeeId.name } : null,
    applicant: row.applicantId ? { _id: String(row.applicantId._id), name: row.applicantId.name } : null,
    generatedBy: row.generatedBy ? { _id: String(row.generatedBy._id), name: row.generatedBy.name } : null,
  };
}

export type CreateGeneratedDocumentInput = {
  templateId: string;
  employeeId?: string;
  applicantId?: string;
  batchId?: string;
  fileName: string;
  fileUrl: string;
  generatedBy?: string;
};

export type GeneratedDocumentFilters = {
  templateId?: string;
  status?: GeneratedDocumentStatus;
  batchId?: string;
  recipientType?: "employee" | "applicant";
  dateFrom?: Date;
  dateTo?: Date;
};

export type GeneratedDocumentListResult = {
  rows: GeneratedDocumentRow[];
  total: number;
};

export const generatedDocumentRepository = {
  async findById(id: string): Promise<GeneratedDocumentRow | null> {
    const row = await GeneratedDocument.findById(id)
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async findRecent(limit = 20): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByEmployeeId(employeeId: string): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find({ employeeId })
      .sort({ createdAt: -1 })
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByApplicantId(applicantId: string): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find({ applicantId })
      .sort({ createdAt: -1 })
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByBatchId(batchId: string): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find({ batchId })
      .sort({ createdAt: -1 })
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  /** General filtered/paginated query backing the document history view. */
  async find(
    filters: GeneratedDocumentFilters,
    opts: { page?: number; pageSize?: number } = {},
  ): Promise<GeneratedDocumentListResult> {
    const query: Record<string, unknown> = {};
    if (filters.templateId) query.templateId = filters.templateId;
    if (filters.status) query.status = filters.status;
    if (filters.batchId) query.batchId = filters.batchId;
    if (filters.recipientType === "employee") query.employeeId = { $ne: null };
    if (filters.recipientType === "applicant") query.applicantId = { $ne: null };
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {
        ...(filters.dateFrom ? { $gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { $lte: filters.dateTo } : {}),
      };
    }

    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      GeneratedDocument.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("templateId", "name")
        .populate("employeeId", "name")
        .populate("applicantId", "name")
        .populate("generatedBy", "name")
        .lean<RawRow[]>(),
      GeneratedDocument.countDocuments(query),
    ]);

    return { rows: rows.map(serialize), total };
  },
  async create(input: CreateGeneratedDocumentInput): Promise<GeneratedDocumentRow> {
    const doc = await GeneratedDocument.create({
      ...input,
      statusHistory: [{ status: "generated", changedAt: new Date(), changedBy: input.generatedBy }],
    });
    const populated = await GeneratedDocument.findById(doc._id)
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow>();
    return serialize(populated!);
  },
  /** Unconditional status write — transition-rule enforcement (generated→sent→signed) lives in the service layer, not here. */
  async updateStatus(id: string, status: GeneratedDocumentStatus, actorId?: string): Promise<GeneratedDocumentRow | null> {
    await GeneratedDocument.findByIdAndUpdate(id, {
      status,
      $push: { statusHistory: { status, changedAt: new Date(), changedBy: actorId } },
    });
    const populated = await GeneratedDocument.findById(id)
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow | null>();
    return populated ? serialize(populated) : null;
  },
  async delete(id: string) {
    return GeneratedDocument.findByIdAndDelete(id).lean();
  },
};
