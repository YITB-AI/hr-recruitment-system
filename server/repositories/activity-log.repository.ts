import { ActivityLog, ACTIVITY_ENTITY_TYPES } from "@/models";
import type { Types } from "mongoose";

export type ActivityLogRow = {
  _id: string;
  message: string;
  actorName: string | null;
  createdAt: Date;
};

export type CreateActivityLogInput = {
  actorId?: Types.ObjectId | string;
  actorName?: string;
  action: string;
  entityType: (typeof ACTIVITY_ENTITY_TYPES)[number];
  entityId: Types.ObjectId | string;
  message: string;
};

export const activityLogRepository = {
  findRecent(limit: number) {
    return ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("message actorName createdAt")
      .lean<ActivityLogRow[]>();
  },
  create(input: CreateActivityLogInput) {
    return ActivityLog.create(input);
  },
};
