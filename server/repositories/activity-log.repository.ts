import { ActivityLog, ACTIVITY_ENTITY_TYPES } from "@/models";
import type { Types } from "mongoose";

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

export const activityLogRepository = {
  findRecent(companyId: string, limit: number) {
    return ActivityLog.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("message actorName createdAt")
      .lean<ActivityLogRow[]>();
  },
  async findAllPaginated(
    companyId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: ActivityLogRow[]; total: number }> {
    const [data, total] = await Promise.all([
      ActivityLog.find({ companyId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select("message actorName createdAt")
        .lean<ActivityLogRow[]>(),
      ActivityLog.countDocuments({ companyId }),
    ]);
    return { data, total };
  },
  findByEntity(companyId: string, entityType: (typeof ACTIVITY_ENTITY_TYPES)[number], entityId: string, limit: number) {
    return ActivityLog.find({ companyId, entityType, entityId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("action message actorName createdAt")
      .lean<Array<ActivityLogRow & { action: string }>>();
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
