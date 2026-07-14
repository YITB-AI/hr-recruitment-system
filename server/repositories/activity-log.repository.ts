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
  create(input: CreateActivityLogInput) {
    return ActivityLog.create(input);
  },
  createMany(inputs: CreateActivityLogInput[]) {
    return ActivityLog.insertMany(inputs);
  },
};
