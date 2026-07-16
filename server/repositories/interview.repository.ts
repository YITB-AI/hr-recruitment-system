import { Interview } from "@/models";
import type { InterviewType } from "@/constants/interview";

export type InterviewRow = {
  _id: string;
  type: string;
  status: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink: string | null;
  notes: string | null;
  interviewerIds: string[];
  applicantId: { _id: string; name: string; email: string } | null;
  jobId: { _id: string; title: string } | null;
};

export type UpcomingInterviewRow = InterviewRow;

type RawRow = Record<string, unknown> & {
  _id: unknown;
  interviewerIds?: unknown[];
  applicantId: { _id: unknown; name: string; email?: string } | null;
  jobId: { _id: unknown; title: string } | null;
};

function serialize(row: RawRow): InterviewRow {
  return {
    _id: String(row._id),
    type: row.type as string,
    status: row.status as string,
    scheduledAt: row.scheduledAt as Date,
    durationMinutes: row.durationMinutes as number,
    meetingLink: (row.meetingLink as string | undefined) ?? null,
    notes: (row.notes as string | undefined) ?? null,
    interviewerIds: (row.interviewerIds ?? []).map((id) => String(id)),
    applicantId: row.applicantId
      ? { _id: String(row.applicantId._id), name: row.applicantId.name, email: row.applicantId.email ?? "" }
      : null,
    jobId: row.jobId ? { _id: String(row.jobId._id), title: row.jobId.title } : null,
  };
}

export type CreateInterviewInput = {
  applicantId: string;
  jobId: string;
  interviewerIds: string[];
  type: InterviewType;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink?: string;
  notes?: string;
};

export type UpdateInterviewInput = Partial<{
  status: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink: string;
  notes: string;
}>;

// Every function takes companyId first and filters by it — see the
// tenant-isolation comment in server/repositories/employee.repository.ts.
// Every read excludes soft-deleted rows (deletedAt: { $exists: false }) —
// same convention as models/Status.ts/status.repository.ts.
export const interviewRepository = {
  async findUpcoming(companyId: string, limit: number): Promise<InterviewRow[]> {
    const rows = await Interview.find({
      companyId,
      status: "scheduled",
      scheduledAt: { $gte: new Date() },
      deletedAt: { $exists: false },
    })
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .populate("applicantId", "name email")
      .populate("jobId", "title")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findAll(companyId: string, limit = 100): Promise<InterviewRow[]> {
    const rows = await Interview.find({ companyId, deletedAt: { $exists: false } })
      .sort({ scheduledAt: -1 })
      .limit(limit)
      .populate("applicantId", "name email")
      .populate("jobId", "title")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findById(companyId: string, id: string): Promise<InterviewRow | null> {
    const row = await Interview.findOne({ _id: id, companyId, deletedAt: { $exists: false } })
      .populate("applicantId", "name email")
      .populate("jobId", "title")
      .lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async findByApplicantId(companyId: string, applicantId: string, limit = 20): Promise<InterviewRow[]> {
    const rows = await Interview.find({ companyId, applicantId, deletedAt: { $exists: false } })
      .sort({ scheduledAt: -1 })
      .limit(limit)
      .populate("applicantId", "name email")
      .populate("jobId", "title")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  create(companyId: string, input: CreateInterviewInput) {
    return Interview.create({ ...input, companyId, status: "scheduled" });
  },
  async update(companyId: string, id: string, input: UpdateInterviewInput): Promise<InterviewRow | null> {
    const row = await Interview.findOneAndUpdate({ _id: id, companyId, deletedAt: { $exists: false } }, input, {
      returnDocument: "after",
    })
      .populate("applicantId", "name email")
      .populate("jobId", "title")
      .lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async softDelete(companyId: string, id: string): Promise<void> {
    await Interview.updateOne({ _id: id, companyId }, { deletedAt: new Date() });
  },
};
