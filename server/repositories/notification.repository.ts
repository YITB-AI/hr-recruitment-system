import { Notification } from "@/models";

export type NotificationRow = {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
};

export const notificationRepository = {
  countUnread(userId: string) {
    return Notification.countDocuments({ userId, read: false });
  },
  async findRecent(userId: string, limit: number): Promise<NotificationRow[]> {
    const rows = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title message read createdAt")
      .lean<Array<{ _id: unknown; title: string; message: string; read: boolean; createdAt: Date }>>();

    return rows.map((row) => ({
      _id: String(row._id),
      title: row.title,
      message: row.message,
      read: row.read,
      createdAt: row.createdAt,
    }));
  },
};
