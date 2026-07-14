import { Notification } from "@/models";

export type NotificationRow = {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
};

export type CreateNotificationInput = {
  companyId: string;
  userId: string;
  title: string;
  message: string;
};

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
  async findAllPaginated(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: NotificationRow[]; total: number }> {
    const [rows, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select("title message read createdAt")
        .lean<Array<{ _id: unknown; title: string; message: string; read: boolean; createdAt: Date }>>(),
      Notification.countDocuments({ userId }),
    ]);

    return {
      data: rows.map((row) => ({
        _id: String(row._id),
        title: row.title,
        message: row.message,
        read: row.read,
        createdAt: row.createdAt,
      })),
      total,
    };
  },
  async markRead(id: string, userId: string): Promise<void> {
    await Notification.updateOne({ _id: id, userId }, { $set: { read: true } });
  },
  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
  },
};
