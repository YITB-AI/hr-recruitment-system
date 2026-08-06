import { PlatformErrorLog, PLATFORM_ERROR_SOURCES } from "@/models";
import { Types } from "mongoose";

export type PlatformErrorSource = (typeof PLATFORM_ERROR_SOURCES)[number];

export type PlatformErrorLogRow = {
  _id: string;
  companyId: string | null;
  companyName: string | null;
  source: PlatformErrorSource;
  action: string | null;
  message: string;
  createdAt: Date;
};

export type CreatePlatformErrorLogInput = {
  companyId?: Types.ObjectId | string;
  source: PlatformErrorSource;
  action?: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
};

type RawRow = Record<string, unknown> & { _id: unknown; companyId?: { _id: unknown; name: string } | unknown };

function serialize(row: RawRow): PlatformErrorLogRow {
  const populatedCompany = row.companyId as { _id: unknown; name: string } | null | undefined;
  const isPopulated = populatedCompany && typeof populatedCompany === "object" && "name" in populatedCompany;
  return {
    _id: String(row._id),
    companyId: row.companyId ? String(isPopulated ? populatedCompany!._id : row.companyId) : null,
    companyName: isPopulated ? populatedCompany!.name : null,
    source: row.source as PlatformErrorSource,
    action: (row.action as string | undefined) ?? null,
    message: row.message as string,
    createdAt: row.createdAt as Date,
  };
}

// This is the ONE place in the app allowed to read/write across every
// company's errors at once — deliberately unscoped by companyId, unlike
// every tenant-data repository elsewhere in this codebase. Only ever called
// from Global Super Admin surfaces (gated by requirePlatformAdmin) and from
// the error-capture hook itself (lib/platform-error.ts), which is not a
// per-request-actor context.
export const platformErrorLogRepository = {
  async create(input: CreatePlatformErrorLogInput): Promise<void> {
    await PlatformErrorLog.create(input);
  },

  async countTotal(): Promise<number> {
    return PlatformErrorLog.countDocuments();
  },

  async countSince(since: Date): Promise<number> {
    return PlatformErrorLog.countDocuments({ createdAt: { $gte: since } });
  },

  async countCreatedBetween(start: Date, end: Date): Promise<number> {
    return PlatformErrorLog.countDocuments({ createdAt: { $gte: start, $lt: end } });
  },

  async findRecent(limit: number): Promise<PlatformErrorLogRow[]> {
    const rows = await PlatformErrorLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("companyId", "name")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },

  async findAllPaginated(filters: {
    companyId?: string;
    source?: PlatformErrorSource;
    page: number;
    pageSize: number;
  }): Promise<{ rows: PlatformErrorLogRow[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filters.companyId) query.companyId = filters.companyId;
    if (filters.source) query.source = filters.source;

    const [rows, total] = await Promise.all([
      PlatformErrorLog.find(query)
        .sort({ createdAt: -1 })
        .skip((filters.page - 1) * filters.pageSize)
        .limit(filters.pageSize)
        .populate("companyId", "name")
        .lean<RawRow[]>(),
      PlatformErrorLog.countDocuments(query),
    ]);

    return { rows: rows.map(serialize), total };
  },
};
