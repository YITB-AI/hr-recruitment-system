import { Types } from "mongoose";
import { ApplicantFollowup } from "@/models";
import type { FollowupType, FollowupStatus } from "@/constants/followup";

export type ApplicantFollowupRow = {
  _id: string;
  applicantId: string;
  type: FollowupType;
  source: string;
  status: FollowupStatus;
  response: string | null;
  error: string | null;
  message: string | null;
  requestedAt: Date | null;
  retryCount: number;
  createdByName: string | null;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown; applicantId: unknown };

function serialize(row: RawRow): ApplicantFollowupRow {
  return {
    _id: String(row._id),
    applicantId: String(row.applicantId),
    type: row.type as FollowupType,
    source: row.source as string,
    status: row.status as FollowupStatus,
    response: (row.response as string | undefined) ?? null,
    error: (row.error as string | undefined) ?? null,
    message: (row.message as string | undefined) ?? null,
    requestedAt: (row.requestedAt as Date | undefined) ?? null,
    retryCount: (row.retryCount as number | undefined) ?? 0,
    createdByName: (row.createdByName as string | undefined) ?? null,
    createdAt: row.createdAt as Date,
  };
}

export type CreateApplicantFollowupInput = {
  companyId: string;
  applicantId: string;
  type: FollowupType;
  source: string;
  status: FollowupStatus;
  response?: string;
  error?: string;
  message?: string;
  requestedAt?: Date;
  retryCount?: number;
  createdBy?: string;
  createdByName: string;
};

export type CommunicationCounts = Record<FollowupType, number> & { pending: number; failed: number };

const ACTIVE_STATUSES: FollowupStatus[] = ["pending", "sent"];

// Every function takes companyId first and filters by it — see the
// tenant-isolation comment in server/repositories/employee.repository.ts.
export const applicantFollowupRepository = {
  async create(input: CreateApplicantFollowupInput): Promise<ApplicantFollowupRow> {
    const doc = await ApplicantFollowup.create(input);
    return serialize(doc.toObject());
  },
  async findByApplicantId(companyId: string, applicantId: string, limit = 20): Promise<ApplicantFollowupRow[]> {
    const rows = await ApplicantFollowup.find({ companyId, applicantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async countPriorAttempts(companyId: string, applicantId: string, type: FollowupType): Promise<number> {
    return ApplicantFollowup.countDocuments({ companyId, applicantId, type });
  },
  // Blocks firing a second AI Call (or other channel) while one is still
  // pending/just sent — separate from EmailLog's existsRecentSuccess since a
  // call outcome isn't known immediately the way a webhook ack is.
  async existsRecentActive(companyId: string, applicantId: string, type: FollowupType, windowMs: number): Promise<boolean> {
    const count = await ApplicantFollowup.countDocuments({
      companyId,
      applicantId,
      type,
      status: { $in: ACTIVE_STATUSES },
      createdAt: { $gte: new Date(Date.now() - windowMs) },
    });
    return count > 0;
  },
  async countByType(companyId: string): Promise<CommunicationCounts> {
    const companyObjectId = new Types.ObjectId(companyId);
    const rows = await ApplicantFollowup.aggregate<{ _id: FollowupType; count: number }>([
      { $match: { companyId: companyObjectId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);
    const pendingRows = await ApplicantFollowup.aggregate<{ _id: FollowupStatus; count: number }>([
      { $match: { companyId: companyObjectId, status: { $in: ["pending", "failed"] } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const byType = new Map(rows.map((r) => [r._id, r.count]));
    const byStatus = new Map(pendingRows.map((r) => [r._id, r.count]));

    return {
      call: byType.get("call") ?? 0,
      email: byType.get("email") ?? 0,
      sms: byType.get("sms") ?? 0,
      whatsapp: byType.get("whatsapp") ?? 0,
      pending: byStatus.get("pending") ?? 0,
      failed: byStatus.get("failed") ?? 0,
    };
  },
};
