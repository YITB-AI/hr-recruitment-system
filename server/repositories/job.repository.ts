import { randomUUID } from "node:crypto";
import { Job } from "@/models";
import type { JobStatus, JobType } from "@/constants/job";

export type JobRow = {
  _id: string;
  job_id: string;
  title: string;
  description: string | null;
  department: string;
  city: string;
  state: string;
  country: string;
  status: string;
  type: string | null;
  createdAt: string | null;
};

type RawJobRow = Record<string, unknown> & { _id: unknown };

function serializeJobRow(row: RawJobRow): JobRow {
  return {
    _id: String(row._id),
    job_id: row.job_id as string,
    title: row.title as string,
    description: (row.description as string | undefined) ?? null,
    department: (row.department as string) || "",
    city: (row.city as string) || "",
    state: (row.state as string) || "",
    country: (row.country as string) || "",
    status: (row.status as string) || "Open",
    type: (row.type as string | undefined) ?? null,
    createdAt: (row.createdAt as string | undefined) ?? null,
  };
}

export type CreateJobInput = {
  title: string;
  description?: string;
  department?: string;
  city?: string;
  state?: string;
  country?: string;
  status: JobStatus;
  type: JobType;
};

// createdAt is stored as an ISO string (n8n's convention), not a BSON date,
// so range queries convert it via $expr/$toDate rather than comparing
// directly against Date instances.
//
// Job is the one collection where companyId is NOT a required first
// parameter on every function — see the comment on companyId in
// models/Job.ts. countTotal/countCreatedBetween/findAll below are scoped to
// a company (app-created jobs always have one); findUnmapped/assignCompany
// deliberately operate on rows with NO companyId (n8n-authored, platform-
// admin-only — see requirePlatformAdmin in job-mapping.service.ts).
export const jobRepository = {
  countTotal(companyId: string) {
    return Job.countDocuments({ companyId });
  },
  countCreatedBetween(companyId: string, start: Date, end: Date) {
    return Job.countDocuments({
      companyId,
      $expr: {
        $and: [
          { $gte: [{ $toDate: "$createdAt" }, start] },
          { $lt: [{ $toDate: "$createdAt" }, end] },
        ],
      },
    });
  },
  /** Minimal shape for the Applicants filter dropdown — this company's jobs only. */
  async findAllForPicker(companyId: string): Promise<Array<{ _id: string; title: string }>> {
    const rows = await Job.find({ companyId }).select("_id title").lean<Array<{ _id: unknown; title: string }>>();
    return rows.map((row) => ({ _id: String(row._id), title: row.title }));
  },
  async findAllForCompany(companyId: string): Promise<JobRow[]> {
    const rows = await Job.find({ companyId }).sort({ createdAt: -1 }).lean<RawJobRow[]>();
    return rows.map(serializeJobRow);
  },
  async findById(companyId: string, id: string): Promise<JobRow | null> {
    const row = await Job.findOne({ _id: id, companyId }).lean<RawJobRow | null>();
    return row ? serializeJobRow(row) : null;
  },
  async create(companyId: string, input: CreateJobInput): Promise<JobRow> {
    const now = new Date().toISOString();
    const doc = await Job.create({
      companyId,
      job_id: `APP-${randomUUID()}`,
      title: input.title,
      description: input.description,
      department: input.department ?? "",
      city: input.city ?? "",
      state: input.state ?? "",
      country: input.country ?? "",
      status: input.status,
      type: input.type,
      createdAt: now,
      updatedAt: now,
    });
    return serializeJobRow(doc.toObject());
  },
  /** Rows the external n8n pipeline wrote with no companyId — see the comment on Job.companyId. */
  async findUnmapped(): Promise<Array<{ _id: string; job_id: string; title: string; department: string; city: string; country: string }>> {
    const rows = await Job.find({ companyId: { $exists: false } })
      .select("job_id title department city country")
      .lean<Array<Record<string, unknown> & { _id: unknown }>>();
    return rows.map((row) => ({
      _id: String(row._id),
      job_id: row.job_id as string,
      title: row.title as string,
      department: (row.department as string) || "",
      city: (row.city as string) || "",
      country: (row.country as string) || "",
    }));
  },
  async assignCompany(jobId: string, companyId: string): Promise<void> {
    await Job.updateOne({ _id: jobId }, { companyId });
  },
};
