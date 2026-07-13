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
  applicantId: { _id: string; name: string } | null;
  jobId: { _id: string; title: string } | null;
};

export type UpcomingInterviewRow = InterviewRow;

type RawRow = Record<string, unknown> & {
  _id: unknown;
  applicantId: { _id: unknown; name: string } | null;
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
    applicantId: row.applicantId ? { _id: String(row.applicantId._id), name: row.applicantId.name } : null,
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

// Every function takes companyId first and filters by it — see the
// tenant-isolation comment in server/repositories/employee.repository.ts.
export const interviewRepository = {
  async findUpcoming(companyId: string, limit: number): Promise<InterviewRow[]> {
    const rows = await Interview.find({ companyId, status: "scheduled", scheduledAt: { $gte: new Date() } })
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .populate("applicantId", "name")
      .populate("jobId", "title")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findAll(companyId: string, limit = 100): Promise<InterviewRow[]> {
    const rows = await Interview.find({ companyId })
      .sort({ scheduledAt: -1 })
      .limit(limit)
      .populate("applicantId", "name")
      .populate("jobId", "title")
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
  create(companyId: string, input: CreateInterviewInput) {
    return Interview.create({ ...input, companyId, status: "scheduled" });
  },
};
