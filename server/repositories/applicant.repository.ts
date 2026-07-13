import { Types, type PipelineStage } from "mongoose";
import { Applicant, ResumeAnalysis, Job } from "@/models";
import { PIPELINE_STATUSES, type ApplicantStatus } from "@/constants/applicant-status";

export type ApplicantListRow = {
  _id: string;
  name: string;
  email: string;
  status: ApplicantStatus;
  source: string;
  appliedAt: Date;
  score: number | null;
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

export type ApplicantPickerRow = { _id: string; name: string; email: string };

export type ApplicantListFilters = {
  status?: ApplicantStatus;
  jobId?: string;
  source?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  scoreMin?: number;
  scoreMax?: number;
  sortBy?: "createdAt" | "score";
  sortDir?: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type ApplicantKanbanFilters = Omit<ApplicantListFilters, "status" | "page" | "pageSize" | "sortBy" | "sortDir">;

export type ApplicantListResult = { rows: ApplicantListRow[]; total: number };

// Raw shape produced by the aggregation pipeline below, before serialization.
type RawAggregateRow = {
  _id: unknown;
  name: string;
  email: string;
  status: ApplicantStatus;
  source: string;
  appliedAt: Date;
  score: number | null;
  job: { _id: unknown; title: string } | null;
};

function serializeAggregateRow(row: RawAggregateRow): ApplicantListRow {
  return {
    _id: String(row._id),
    name: row.name,
    email: row.email,
    status: row.status,
    source: row.source,
    appliedAt: row.appliedAt,
    score: row.score,
    jobId: row.job ? { _id: String(row.job._id), title: row.job.title } : null,
  };
}

function buildMatchStage(filters: Partial<ApplicantListFilters>): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.status) match.status = filters.status;
  if (filters.jobId) {
    // An invalid/stale jobId (malformed URL, deleted job) should yield "no
    // results" rather than crash — Types.ObjectId throws on non-hex input.
    match.jobId = Types.ObjectId.isValid(filters.jobId) ? new Types.ObjectId(filters.jobId) : null;
  }
  if (filters.source) match.source = filters.source;
  if (filters.search) {
    const pattern = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{ name: pattern }, { email: pattern }, { currentPosition: pattern }, { skills: pattern }];
  }
  if (filters.dateFrom || filters.dateTo) {
    match.appliedAt = {
      ...(filters.dateFrom ? { $gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { $lte: filters.dateTo } : {}),
    };
  }
  return match;
}

// Joins each applicant to their latest resume analysis (for the Score
// column/filter/sort) and their job title, computing `hasScore` so unscored
// applicants can be sorted last regardless of sort direction.
function scoreAndJobLookupStages(): PipelineStage[] {
  return [
    {
      $lookup: {
        from: ResumeAnalysis.collection.name,
        let: { aid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$applicantId", "$$aid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { _id: 0, overallScore: 1 } },
        ],
        as: "latestAnalysis",
      },
    },
    {
      $lookup: {
        from: Job.collection.name,
        localField: "jobId",
        foreignField: "_id",
        as: "jobDocs",
      },
    },
    {
      $addFields: {
        score: { $ifNull: [{ $arrayElemAt: ["$latestAnalysis.overallScore", 0] }, null] },
        job: { $arrayElemAt: ["$jobDocs", 0] },
        hasScore: { $gt: [{ $size: "$latestAnalysis" }, 0] },
      },
    },
  ];
}

function buildScoreMatchStage(filters: Partial<ApplicantListFilters>): Record<string, unknown> | null {
  if (filters.scoreMin === undefined && filters.scoreMax === undefined) return null;
  const cond: Record<string, unknown> = {};
  if (filters.scoreMin !== undefined) cond.$gte = filters.scoreMin;
  if (filters.scoreMax !== undefined) cond.$lte = filters.scoreMax;
  return { score: cond };
}

function buildSortStage(sortBy: ApplicantListFilters["sortBy"], sortDir: ApplicantListFilters["sortDir"]): Record<string, 1 | -1> {
  const dir: 1 | -1 = sortDir === "asc" ? 1 : -1;
  if (sortBy === "score") {
    // hasScore always wins first, regardless of dir — unscored applicants sort last either way.
    return { hasScore: -1, score: dir, createdAt: -1 };
  }
  return { createdAt: dir };
}

const LIST_PROJECT = {
  name: 1,
  email: 1,
  status: 1,
  source: 1,
  appliedAt: 1,
  score: 1,
  job: { _id: 1, title: 1 },
} as const;

export const applicantRepository = {
  countTotal() {
    return Applicant.countDocuments();
  },
  /** Minimal shape for pickers (document generation, etc.), mirrors employeeRepository.findAllForPicker. */
  async findAllForPicker(): Promise<ApplicantPickerRow[]> {
    const rows = await Applicant.find()
      .select("name email")
      .lean<Array<Record<string, unknown> & { _id: unknown }>>();
    return rows.map((row) => ({
      _id: String(row._id),
      name: row.name as string,
      email: row.email as string,
    }));
  },
  async findAllPaginated(filters: ApplicantListFilters): Promise<ApplicantListResult> {
    const match = buildMatchStage(filters);
    const scoreMatch = buildScoreMatchStage(filters);
    const sortStage = buildSortStage(filters.sortBy, filters.sortDir);

    const pipeline: PipelineStage[] = [
      { $match: match },
      ...scoreAndJobLookupStages(),
      ...(scoreMatch ? [{ $match: scoreMatch } as PipelineStage] : []),
      {
        $facet: {
          data: [
            { $sort: sortStage },
            { $skip: (filters.page - 1) * filters.pageSize },
            { $limit: filters.pageSize },
            { $project: LIST_PROJECT },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Applicant.aggregate<{ data: RawAggregateRow[]; totalCount: Array<{ count: number }> }>(pipeline);
    const rows = (result?.data ?? []).map(serializeAggregateRow);
    const total = result?.totalCount?.[0]?.count ?? 0;

    return { rows, total };
  },
  /** Same filters/joins as findAllPaginated, grouped by pipeline status for the kanban board — no pagination, capped per column. */
  async findAllForKanban(filters: ApplicantKanbanFilters): Promise<Record<ApplicantStatus, ApplicantListRow[]>> {
    const match = buildMatchStage(filters);
    match.status = { $in: PIPELINE_STATUSES };
    const scoreMatch = buildScoreMatchStage(filters);

    const pipeline: PipelineStage[] = [
      { $match: match },
      ...scoreAndJobLookupStages(),
      ...(scoreMatch ? [{ $match: scoreMatch } as PipelineStage] : []),
      { $sort: { createdAt: -1 } },
      { $limit: 500 },
      { $project: LIST_PROJECT },
    ];

    const rows = await Applicant.aggregate<RawAggregateRow>(pipeline);

    const grouped = Object.fromEntries(PIPELINE_STATUSES.map((status) => [status, [] as ApplicantListRow[]])) as Record<
      ApplicantStatus,
      ApplicantListRow[]
    >;
    const CAP_PER_COLUMN = 200;
    for (const row of rows) {
      const serialized = serializeAggregateRow(row);
      const bucket = grouped[serialized.status];
      if (bucket.length < CAP_PER_COLUMN) bucket.push(serialized);
    }
    return grouped;
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
  async updateStatusMany(ids: string[], status: ApplicantStatus): Promise<number> {
    const result = await Applicant.updateMany({ _id: { $in: ids } }, { status });
    return result.modifiedCount;
  },
  /** Minimal per-applicant info for building bulk-action activity-log messages. */
  async findMinimalByIds(ids: string[]): Promise<Array<{ _id: string; name: string; jobId: { title: string } | null }>> {
    const rows = await Applicant.find({ _id: { $in: ids } })
      .select("name jobId")
      .populate("jobId", "title")
      .lean<Array<Record<string, unknown> & { _id: unknown; jobId: { title: string } | null }>>();
    return rows.map((row) => ({
      _id: String(row._id),
      name: row.name as string,
      jobId: row.jobId ? { title: row.jobId.title } : null,
    }));
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
