import { Types } from "mongoose";
import { EmployeeDocument } from "@/models/EmployeeDocument";

export type EmployeeDocumentRow = {
  _id: string;
  companyId: string;
  employeeId: string;
  fileName: string;
  fileKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string | null;
  createdAt: string;
};

type RawRow = {
  _id: unknown;
  companyId: unknown;
  employeeId: unknown;
  fileName: string;
  fileKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName?: string | null;
  createdAt: unknown;
};

function serialize(row: RawRow): EmployeeDocumentRow {
  return {
    _id: String(row._id),
    companyId: String(row.companyId),
    employeeId: String(row.employeeId),
    fileName: row.fileName,
    fileKey: row.fileKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedByName: row.uploadedByName ?? null,
    createdAt: new Date(row.createdAt as string).toISOString(),
  };
}

export const employeeDocumentRepository = {
  async findByEmployeeId(companyId: string, employeeId: string): Promise<EmployeeDocumentRow[]> {
    const rows = await EmployeeDocument.find({ companyId, employeeId }).sort({ createdAt: -1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },

  async findById(companyId: string, id: string): Promise<EmployeeDocumentRow | null> {
    const row = await EmployeeDocument.findOne({ _id: id, companyId }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },

  // Deliberately unscoped, same convention as generatedDocumentRepository's
  // findByFileOrPdfUrlUnscoped — app/api/files/[...path]/route.ts uses this
  // to find out which company a requested file belongs to BEFORE it knows
  // whether the caller is entitled to it.
  async findByFileKeyUnscoped(fileKey: string): Promise<{ _id: string; companyId: string } | null> {
    const row = await EmployeeDocument.findOne({ fileKey }).select("companyId").lean<{ _id: unknown; companyId: unknown } | null>();
    return row ? { _id: String(row._id), companyId: String(row.companyId) } : null;
  },

  async create(input: {
    companyId: string;
    employeeId: string;
    fileName: string;
    fileKey: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy?: string;
    uploadedByName?: string;
  }): Promise<EmployeeDocumentRow> {
    const created = await EmployeeDocument.create(input);
    return serialize(created.toObject() as RawRow);
  },

  async deleteById(companyId: string, id: string): Promise<EmployeeDocumentRow | null> {
    const row = await EmployeeDocument.findOneAndDelete({ _id: id, companyId }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },

  // For the employee export's "Documents" column — one aggregate query
  // instead of N per-employee counts.
  async countByEmployeeIds(companyId: string, employeeIds: string[]): Promise<Record<string, number>> {
    if (employeeIds.length === 0) return {};
    const rows = await EmployeeDocument.aggregate<{ _id: unknown; count: number }>([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          employeeId: { $in: employeeIds.map((id) => new Types.ObjectId(id)) },
        },
      },
      { $group: { _id: "$employeeId", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
  },
};
