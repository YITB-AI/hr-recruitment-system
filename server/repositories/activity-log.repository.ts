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
  create(input: CreateActivityLogInput) {
    return ActivityLog.create(input);
  },
  createMany(inputs: CreateActivityLogInput[]) {
    return ActivityLog.insertMany(inputs);
  },
};
