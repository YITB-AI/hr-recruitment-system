import { Types } from "mongoose";
import { EmailLog } from "@/models";
import type { EmailTemplate, EmailLogStatus } from "@/constants/email";

export type EmailLogRow = {
  _id: string;
  applicantId: string;
  interviewId: string | null;
  to: string;
  subject: string;
  template: EmailTemplate;
  status: EmailLogStatus;
  userName: string | null;
  response: string | null;
  error: string | null;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown; applicantId: unknown };

function serialize(row: RawRow): EmailLogRow {
  return {
    _id: String(row._id),
    applicantId: String(row.applicantId),
    interviewId: row.interviewId ? String(row.interviewId) : null,
    to: row.to as string,
    subject: row.subject as string,
    template: row.template as EmailTemplate,
    status: row.status as EmailLogStatus,
    userName: (row.userName as string | undefined) ?? null,
    response: (row.response as string | undefined) ?? null,
    error: (row.error as string | undefined) ?? null,
    createdAt: row.createdAt as Date,
  };
}

export type CreateEmailLogInput = {
  companyId: string;
  applicantId: string;
  interviewId?: string;
  to: string;
  subject: string;
  template: EmailTemplate;
  status: EmailLogStatus;
  userId?: string;
  userName: string;
  response?: string;
  error?: string;
};

const RECENT_SEND_WINDOW_MS = 30 * 1000;

// Every function takes companyId first and filters by it — see the
// tenant-isolation comment in server/repositories/employee.repository.ts.
export const emailLogRepository = {
  async create(input: CreateEmailLogInput): Promise<EmailLogRow> {
    const doc = await EmailLog.create(input);
    return serialize(doc.toObject());
  },
  async findByApplicantId(companyId: string, applicantId: string, limit = 20): Promise<EmailLogRow[]> {
    const rows = await EmailLog.find({ companyId, applicantId }).sort({ createdAt: -1 }).limit(limit).lean<RawRow[]>();
    return rows.map(serialize);
  },
  // Blocks an accidental double-click/double-submit from firing the exact
  // same email twice in a row — only counts already-successful sends, so a
  // failed attempt can always be retried immediately.
  async existsRecentSuccess(
    companyId: string,
    applicantId: string,
    template: EmailTemplate,
    interviewId?: string,
  ): Promise<boolean> {
    const count = await EmailLog.countDocuments({
      companyId,
      applicantId,
      template,
      interviewId: interviewId ?? { $exists: false },
      status: "sent",
      createdAt: { $gte: new Date(Date.now() - RECENT_SEND_WINDOW_MS) },
    });
    return count > 0;
  },
  // Batch lookup (avoid N+1) — one row per interview, whichever was sent
  // most recently, for the "Sent" status badge on interview lists.
  async findLatestByInterviewIds(companyId: string, interviewIds: string[]): Promise<Map<string, EmailLogRow>> {
    if (interviewIds.length === 0) return new Map();
    const validIds = interviewIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    const rows = await EmailLog.aggregate<{ _id: unknown; doc: RawRow }>([
      { $match: { companyId: new Types.ObjectId(companyId), interviewId: { $in: validIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$interviewId", doc: { $first: "$$ROOT" } } },
    ]);
    const map = new Map<string, EmailLogRow>();
    for (const row of rows) map.set(String(row._id), serialize(row.doc));
    return map;
  },
};
