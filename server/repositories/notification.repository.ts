import { Types } from "mongoose";
import { Notification } from "@/models";
import { ACTIVITY_ENTITY_TYPES } from "@/models/ActivityLog";
import type { NotificationType, NotificationPriority } from "@/constants/notification";

type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

export type NotificationRow = {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  type: NotificationType;
  priority: NotificationPriority;
  entityType: ActivityEntityType | null;
  entityId: string | null;
};

export type CreateNotificationInput = {
  companyId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  entityType?: ActivityEntityType;
  entityId?: string;
};

type RawNotificationRow = {
  _id: unknown;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  type?: NotificationType;
  priority?: NotificationPriority;
  entityType?: ActivityEntityType;
  entityId?: unknown;
};

const SELECT_FIELDS = "title message read createdAt type priority entityType entityId";

// The one load-bearing spot for graceful fallbacks on rows created before
// type/priority/entityType/entityId existed — every read path gets a real
// value here, never `undefined` reaching a UI component.
function serialize(row: RawNotificationRow): NotificationRow {
  return {
    _id: String(row._id),
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.createdAt,
    type: row.type ?? "system",
    priority: row.priority ?? "normal",
    entityType: row.entityType ?? null,
    entityId: row.entityId ? String(row.entityId) : null,
  };
}

export const notificationRepository = {
  countUnread(userId: string) {
    return Notification.countDocuments({ userId, read: false });
  },
  async create(input: CreateNotificationInput): Promise<void> {
    await Notification.create(input);
  },
  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    await Notification.insertMany(inputs);
  },
  async findRecent(userId: string, limit: number): Promise<NotificationRow[]> {
    const rows = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(SELECT_FIELDS)
      .lean<RawNotificationRow[]>();
    return rows.map(serialize);
  },
  async findAllPaginated(
    userId: string,
    page: number,
    pageSize: number,
    type?: NotificationType,
  ): Promise<{ data: NotificationRow[]; total: number }> {
    const query: Record<string, unknown> = { userId, ...(type ? { type } : {}) };
    const [rows, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select(SELECT_FIELDS)
        .lean<RawNotificationRow[]>(),
      Notification.countDocuments(query),
    ]);

    return { data: rows.map(serialize), total };
  },
  async findByIdForUser(id: string, userId: string): Promise<NotificationRow | null> {
    const row = await Notification.findOne({ _id: id, userId }).select(SELECT_FIELDS).lean<RawNotificationRow | null>();
    return row ? serialize(row) : null;
  },
  /** Per-type counts for the Notifications page's category sidebar. */
  async countByType(userId: string): Promise<Array<{ type: NotificationType; count: number; unread: number }>> {
    const rows = await Notification.aggregate<{ _id: NotificationType | null; count: number; unread: number }>([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: { _id: "$type", count: { $sum: 1 }, unread: { $sum: { $cond: ["$read", 0, 1] } } } },
    ]);
    return rows.map((row) => ({ type: row._id ?? "system", count: row.count, unread: row.unread }));
  },
  async markRead(id: string, userId: string): Promise<void> {
    await Notification.updateOne({ _id: id, userId }, { $set: { read: true } });
  },
  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
  },

  // --- Orphaned-record repair (features/settings/services/data-repair.service.ts) ---
  // Same class of bug as applicantRepository/resumeAnalysisRepository: a raw
  // external write could leave userId/companyId as plain strings instead of
  // ObjectIds, or createdAt/updatedAt missing/malformed — every query above
  // filters by userId as an ObjectId-cast value, so a string-typed userId
  // would never match and the notification would just never appear for
  // anyone. No confirmed occurrence of this yet (unlike Applicant/
  // ResumeAnalysis), built proactively for parity since notifications are
  // written by the same class of external-facing code paths.
  async findOrphaned(): Promise<Array<Record<string, unknown> & { _id: unknown }>> {
    return Notification.find({
      $or: [
        { userId: { $type: "string" } },
        { companyId: { $type: "string" } },
        { createdAt: { $exists: false } },
        { createdAt: { $type: "string" } },
        { updatedAt: { $exists: false } },
        { updatedAt: { $type: "string" } },
      ],
    }).lean();
  },
  // Raw driver, not Model.updateOne() — see the identical comment on
  // applicantRepository.repairTypes (Mongoose's timestamps option marks
  // createdAt immutable, blocking any Mongoose-level fix).
  async repairTypes(
    id: string,
    fix: { userId: Types.ObjectId; companyId: Types.ObjectId; createdAt: Date; updatedAt: Date },
  ): Promise<void> {
    await Notification.collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: fix });
  },
};
