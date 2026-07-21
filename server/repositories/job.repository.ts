import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { Job, Applicant, Interview } from "@/models";
import type { JobStatus, JobType, ExperienceLevel, WorkMode } from "@/constants/job";

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
  archivedAt: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  experienceLevel: string | null;
  workMode: string | null;
  skills: string[];
  responsibilities: string[];
  featured: boolean;
};

type RawJobRow = Record<string, unknown> & { _id: unknown };

// The one load-bearing spot for graceful fallbacks on the 7 app-only fields
// below — an n8n-synced job predates all of them, so every consumer (table,
// detail page, export CSV) gets a safe value here instead of `undefined`
// reaching JSX.
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
    archivedAt: row.archivedAt ? (row.archivedAt as Date).toISOString() : null,
    salaryMin: (row.salaryMin as number | undefined) ?? null,
    salaryMax: (row.salaryMax as number | undefined) ?? null,
    salaryCurrency: (row.salaryCurrency as string) || "USD",
    experienceLevel: (row.experienceLevel as string | undefined) ?? null,
    workMode: (row.workMode as string | undefined) ?? null,
    skills: Array.isArray(row.skills) ? (row.skills as string[]) : [],
    responsibilities: Array.isArray(row.responsibilities) ? (row.responsibilities as string[]) : [],
    featured: Boolean(row.featured),
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
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experienceLevel?: ExperienceLevel;
  workMode?: WorkMode;
  skills?: string[];
  responsibilities?: string[];
  featured?: boolean;
};

export type UpdateJobInput = Partial<CreateJobInput>;

export type JobListFilters = {
  search?: string;
  status?: string;
  department?: string;
  includeArchived?: boolean;
  sort?: "newest" | "oldest" | "title_asc" | "title_desc";
  page: number;
  pageSize: number;
};

export type JobListResult = { rows: JobRow[]; total: number };

const SORT_MAP: Record<NonNullable<JobListFilters["sort"]>, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
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
  countByStatus(companyId: string, status: string, includeArchived = false) {
    return Job.countDocuments({ companyId, status, ...(includeArchived ? {} : { archivedAt: { $exists: false } }) });
  },
  // Same $expr/$toDate conversion as countCreatedBetween — updatedAt is an
  // ISO string here too, not a BSON date.
  countByStatusUpdatedBetween(companyId: string, status: string, start: Date, end: Date) {
    return Job.countDocuments({
      companyId,
      status,
      archivedAt: { $exists: false },
      $expr: {
        $and: [
          { $gte: [{ $toDate: "$updatedAt" }, start] },
          { $lt: [{ $toDate: "$updatedAt" }, end] },
        ],
      },
    });
  },
  /** Per-job {total, new} applicant counts for the Jobs list table — one aggregate, not N queries. */
  async countApplicantsByJobIds(
    companyId: string,
    jobIds: string[],
    newSince: Date,
  ): Promise<Map<string, { total: number; new: number }>> {
    if (jobIds.length === 0) return new Map();
    const rows = await Applicant.aggregate<{ _id: unknown; total: number; new: number }>([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          jobId: { $in: jobIds.map((id) => new Types.ObjectId(id)) },
        },
      },
      {
        $group: {
          _id: "$jobId",
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $gte: ["$createdAt", newSince] }, 1, 0] } },
        },
      },
    ]);
    return new Map(rows.map((row) => [String(row._id), { total: row.total, new: row.new }]));
  },
  /** Minimal shape for the Applicants filter dropdown — this company's jobs only. */
  async findAllForPicker(companyId: string): Promise<Array<{ _id: string; title: string }>> {
    const rows = await Job.find({ companyId })
      .select("_id title")
      .limit(1000)
      .lean<Array<{ _id: unknown; title: string }>>();
    return rows.map((row) => ({ _id: String(row._id), title: row.title }));
  },
  async findAllForCompany(companyId: string): Promise<JobRow[]> {
    const rows = await Job.find({ companyId }).sort({ createdAt: -1 }).lean<RawJobRow[]>();
    return rows.map(serializeJobRow);
  },
  async findAllForCompanyPaginated(companyId: string, filters: JobListFilters): Promise<JobListResult> {
    const query: Record<string, unknown> = { companyId };
    if (!filters.includeArchived) query.archivedAt = { $exists: false };
    if (filters.status) query.status = filters.status;
    if (filters.department) query.department = filters.department;
    if (filters.search) {
      const pattern = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: pattern }, { department: pattern }, { job_id: pattern }];
    }

    const sort = SORT_MAP[filters.sort ?? "newest"];
    const [rows, total] = await Promise.all([
      Job.find(query)
        .sort(sort)
        .skip((filters.page - 1) * filters.pageSize)
        .limit(filters.pageSize)
        .lean<RawJobRow[]>(),
      Job.countDocuments(query),
    ]);

    return { rows: rows.map(serializeJobRow), total };
  },
  async findById(companyId: string, id: string): Promise<JobRow | null> {
    const row = await Job.findOne({ _id: id, companyId }).lean<RawJobRow | null>();
    return row ? serializeJobRow(row) : null;
  },
  // Deliberately unscoped — for the platform-admin-only orphaned-record repair
  // tool (features/settings/services/data-repair.service.ts), which doesn't
  // yet know a record's correct companyId at the point it needs to look up
  // the job it references. Same naming convention as
  // applicantFollowupRepository.findByIdUnscoped.
  async findByIdUnscoped(id: string): Promise<JobRow | null> {
    const row = await Job.findById(id).lean<RawJobRow | null>();
    return row ? serializeJobRow(row) : null;
  },
  async update(companyId: string, id: string, input: UpdateJobInput): Promise<JobRow | null> {
    const row = await Job.findOneAndUpdate(
      { _id: id, companyId },
      { ...input, updatedAt: new Date().toISOString() },
      { returnDocument: "after" },
    ).lean<RawJobRow | null>();
    return row ? serializeJobRow(row) : null;
  },
  async archive(companyId: string, id: string): Promise<JobRow | null> {
    const row = await Job.findOneAndUpdate({ _id: id, companyId }, { archivedAt: new Date() }, { returnDocument: "after" }).lean<
      RawJobRow | null
    >();
    return row ? serializeJobRow(row) : null;
  },
  async restore(companyId: string, id: string): Promise<JobRow | null> {
    const row = await Job.findOneAndUpdate({ _id: id, companyId }, { $unset: { archivedAt: "" } }, { returnDocument: "after" }).lean<
      RawJobRow | null
    >();
    return row ? serializeJobRow(row) : null;
  },
  async delete(companyId: string, id: string): Promise<void> {
    await Job.findOneAndDelete({ _id: id, companyId });
  },
  countApplicants(companyId: string, jobId: string): Promise<number> {
    return Applicant.countDocuments({ companyId, jobId });
  },
  countInterviews(companyId: string, jobId: string): Promise<number> {
    return Interview.countDocuments({ companyId, jobId });
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
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      salaryCurrency: input.salaryCurrency ?? "USD",
      experienceLevel: input.experienceLevel,
      workMode: input.workMode,
      skills: input.skills ?? [],
      responsibilities: input.responsibilities ?? [],
      featured: input.featured ?? false,
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

  // --- Orphaned-record repair (features/settings/services/data-repair.service.ts) ---
  // Same pattern as applicantRepository.findOrphaned/repairTypes — a raw
  // n8n insert (its own MongoDB node, not this app's Mongoose layer) can
  // leave companyId as a plain string instead of an ObjectId. A
  // string-typed companyId never matches this file's `{companyId}`
  // tenant-scoped queries, so the job becomes invisible to its own
  // company. Deliberately excludes rows with NO companyId at all — those
  // are the existing findUnmapped()/assignCompany() flow's job (genuinely
  // ambiguous, needs a human), this is only for "already correctly
  // identifies a real company, just the wrong BSON type."
  async findOrphaned(): Promise<Array<Record<string, unknown> & { _id: unknown }>> {
    return Job.find({ companyId: { $type: "string" } }).lean();
  },
  async repairTypes(id: string, companyId: Types.ObjectId): Promise<void> {
    await Job.collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: { companyId } });
  },
};
