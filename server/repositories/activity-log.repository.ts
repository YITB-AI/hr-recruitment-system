import { ActivityLog, ACTIVITY_ENTITY_TYPES } from "@/models";
import { Types } from "mongoose";

export type ActivityLogRow = {
  _id: string;
  message: string;
  actorName: string | null;
  createdAt: Date;
};

export type CreateActivityLogInput = {
  // Optional for now — see the companyId comment in models/User.ts.
  companyId?: Types.ObjectId | string;
  actorId?: Types.ObjectId | string;
  actorName?: string;
  action: string;
  entityType: (typeof ACTIVITY_ENTITY_TYPES)[number];
  entityId: Types.ObjectId | string;
  message: string;
};

type RawActivityRow = Record<string, unknown> & { _id: unknown };

// .lean() returns a plain object but leaves _id as a real ObjectId
// instance, not a string — harmless when a row is only ever read within a
// Server Component, but Next.js rejects passing a raw ObjectId as a prop
// into a Client Component ("only plain objects can be passed..."). This was
// a latent bug in every method below (the ActivityLogRow type claimed
// `_id: string` without anything actually enforcing it) that only surfaced
// once findByEntity's result was first passed into a Client Component.
function serialize(row: RawActivityRow): ActivityLogRow {
  return {
    _id: String(row._id),
    message: row.message as string,
    actorName: (row.actorName as string | undefined) ?? null,
    createdAt: row.createdAt as Date,
  };
}

export const activityLogRepository = {
  async findRecent(companyId: string, limit: number): Promise<ActivityLogRow[]> {
    const rows = await ActivityLog.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("message actorName createdAt")
      .lean<RawActivityRow[]>();
    return rows.map(serialize);
  },
  async findAllPaginated(
    companyId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: ActivityLogRow[]; total: number }> {
    const [rows, total] = await Promise.all([
      ActivityLog.find({ companyId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select("message actorName createdAt")
        .lean<RawActivityRow[]>(),
      ActivityLog.countDocuments({ companyId }),
    ]);
    return { data: rows.map(serialize), total };
  },
  async findByEntity(
    companyId: string,
    entityType: (typeof ACTIVITY_ENTITY_TYPES)[number],
    entityId: string,
    limit: number,
  ): Promise<ActivityLogRow[]> {
    const rows = await ActivityLog.find({ companyId, entityType, entityId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("action message actorName createdAt")
      .lean<RawActivityRow[]>();
    return rows.map(serialize);
  },
  // Batched replacement for calling findByEntity once per entity in a loop
  // (the previous pattern on the Interviews list and Applicant detail
  // pages — up to ~100 concurrent queries on the Interviews page alone).
  // One aggregation, using the {companyId,entityType,entityId,createdAt}
  // compound index to $sort+$group+$slice the top `limitPerEntity` rows
  // per entity in the database instead of in application code.
  async findByEntities(
    companyId: string,
    entityType: (typeof ACTIVITY_ENTITY_TYPES)[number],
    entityIds: string[],
    limitPerEntity: number,
  ): Promise<Map<string, ActivityLogRow[]>> {
    if (entityIds.length === 0) return new Map();
    const rows = await ActivityLog.aggregate<{ _id: unknown; items: RawActivityRow[] }>([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          entityType,
          entityId: { $in: entityIds.map((id) => new Types.ObjectId(id)) },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$entityId",
          items: { $push: { _id: "$_id", action: "$action", message: "$message", actorName: "$actorName", createdAt: "$createdAt" } },
        },
      },
      { $project: { items: { $slice: ["$items", limitPerEntity] } } },
    ]);

    const grouped = new Map<string, ActivityLogRow[]>();
    for (const row of rows) {
      grouped.set(String(row._id), row.items.map(serialize));
    }
    return grouped;
  },
  // Duplicate-submit guard for fire-and-forget webhook triggers with no
  // domain record of their own to check against (e.g. Create Application,
  // which has no pre-existing Applicant row — n8n creates it). Mirrors the
  // spirit of applicantFollowupRepository.existsRecentActive, just scoped to
  // the audit trail since that's the only record this action produces.
  async existsRecentByActorAndEntity(
    companyId: string,
    actorId: string,
    action: string,
    entityId: string,
    windowMs: number,
  ): Promise<boolean> {
    const count = await ActivityLog.countDocuments({
      companyId,
      actorId,
      action,
      entityId,
      createdAt: { $gte: new Date(Date.now() - windowMs) },
    });
    return count > 0;
  },
  create(input: CreateActivityLogInput) {
    return ActivityLog.create(input);
  },
  createMany(inputs: CreateActivityLogInput[]) {
    return ActivityLog.insertMany(inputs);
  },
};
