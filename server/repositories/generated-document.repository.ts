import { GeneratedDocument, GENERATED_DOCUMENT_STATUSES, PDF_STATUSES } from "@/models";

export type GeneratedDocumentStatus = (typeof GENERATED_DOCUMENT_STATUSES)[number];
export type PdfStatus = (typeof PDF_STATUSES)[number];

export type GeneratedDocumentRow = {
  _id: string;
  fileName: string;
  fileUrl: string | null;
  pdfUrl: string | null;
  pdfStatus: PdfStatus;
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
    pdfUrl: (row.pdfUrl as string | undefined) ?? null,
    pdfStatus: (row.pdfStatus as PdfStatus | undefined) ?? "none",
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

// Every function takes companyId first and filters by it — see the
// tenant-isolation comment in server/repositories/employee.repository.ts.
export const generatedDocumentRepository = {
  async findById(companyId: string, id: string): Promise<GeneratedDocumentRow | null> {
    const row = await GeneratedDocument.findOne({ _id: id, companyId })
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async findRecent(companyId: string, limit = 20): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByEmployeeId(companyId: string, employeeId: string): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find({ companyId, employeeId })
      .sort({ createdAt: -1 })
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByApplicantId(companyId: string, applicantId: string): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find({ companyId, applicantId })
      .sort({ createdAt: -1 })
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByBatchId(companyId: string, batchId: string): Promise<GeneratedDocumentRow[]> {
    const rows = await GeneratedDocument.find({ companyId, batchId })
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
    companyId: string,
    filters: GeneratedDocumentFilters,
    opts: { page?: number; pageSize?: number } = {},
  ): Promise<GeneratedDocumentListResult> {
    const query: Record<string, unknown> = { companyId };
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
  async create(companyId: string, input: CreateGeneratedDocumentInput): Promise<GeneratedDocumentRow> {
    const doc = await GeneratedDocument.create({
      ...input,
      companyId,
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
  async updateStatus(
    companyId: string,
    id: string,
    status: GeneratedDocumentStatus,
    actorId?: string,
  ): Promise<GeneratedDocumentRow | null> {
    await GeneratedDocument.findOneAndUpdate(
      { _id: id, companyId },
      { status, $push: { statusHistory: { status, changedAt: new Date(), changedBy: actorId } } },
    );
    const populated = await GeneratedDocument.findOne({ _id: id, companyId })
      .populate("templateId", "name")
      .populate("employeeId", "name")
      .populate("applicantId", "name")
      .populate("generatedBy", "name")
      .lean<RawRow | null>();
    return populated ? serialize(populated) : null;
  },
  async delete(companyId: string, id: string) {
    return GeneratedDocument.findOneAndDelete({ _id: id, companyId }).lean();
  },
  /** Best-effort PDF conversion result — never touches the docx `status`/`statusHistory` fields. */
  async updatePdfInfo(
    companyId: string,
    id: string,
    patch: { pdfStatus: PdfStatus; pdfUrl?: string },
  ): Promise<void> {
    await GeneratedDocument.findOneAndUpdate({ _id: id, companyId }, patch);
  },
};
