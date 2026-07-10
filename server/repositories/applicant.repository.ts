import { Applicant } from "@/models";
import type { ApplicantStatus } from "@/constants/applicant-status";

export type ApplicantListRow = {
  _id: string;
  name: string;
  email: string;
  status: ApplicantStatus;
  source: string;
  appliedAt: Date;
  jobId: { _id: string; title: string } | null;
};

export type ApplicantDetailRow = ApplicantListRow & {
  phone: string | null;
  location: string | null;
  resumeUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  skills: string[];
  experienceYears: number | null;
  currentPosition: string | null;
};

// Raw shape of a .lean() result before normalization: _id/jobId._id are BSON
// ObjectId instances at runtime, not strings — React Server Components can't
// pass those to Client Components ("Only plain objects..." error), so every
// read is normalized through here before leaving the repository.
type RawRow = Record<string, unknown> & {
  _id: unknown;
  jobId: { _id: unknown; title: string } | null;
};

function serialize<TOut>(doc: RawRow | null): TOut | null {
  if (!doc) return null;

  return {
    ...doc,
    _id: String(doc._id),
    jobId: doc.jobId ? { _id: String(doc.jobId._id), title: doc.jobId.title } : null,
  } as TOut;
}

export const applicantRepository = {
  countTotal() {
    return Applicant.countDocuments();
  },
  async findAll(limit = 50): Promise<ApplicantListRow[]> {
    const rows = await Applicant.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("jobId", "title")
      .lean<RawRow[]>();
    return rows.map((row) => serialize<ApplicantListRow>(row)!);
  },
  async findById(id: string): Promise<ApplicantDetailRow | null> {
    const row = await Applicant.findById(id).populate("jobId", "title").lean<RawRow | null>();
    return serialize<ApplicantDetailRow>(row);
  },
  async updateStatus(id: string, status: ApplicantStatus): Promise<ApplicantDetailRow | null> {
    const row = await Applicant.findByIdAndUpdate(id, { status }, { returnDocument: "after" })
      .populate("jobId", "title")
      .lean<RawRow | null>();
    return serialize<ApplicantDetailRow>(row);
  },
  countByStatus(status: ApplicantStatus) {
    return Applicant.countDocuments({ status });
  },
  countCreatedBetween(start: Date, end: Date) {
    return Applicant.countDocuments({ createdAt: { $gte: start, $lt: end } });
  },
  // Approximates "reached this status within the window" via updatedAt, since
  // status transitions aren't separately timestamped.
  countByStatusUpdatedBetween(status: ApplicantStatus, start: Date, end: Date) {
    return Applicant.countDocuments({ status, updatedAt: { $gte: start, $lt: end } });
  },
  async groupByStatus(): Promise<Array<{ status: ApplicantStatus; count: number }>> {
    const rows = await Applicant.aggregate<{ _id: ApplicantStatus; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return rows.map((row) => ({ status: row._id, count: row.count }));
  },
};
