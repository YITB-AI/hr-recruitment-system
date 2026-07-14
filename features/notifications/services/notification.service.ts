import { connectDB } from "@/server/db/connect";
import { notificationRepository } from "@/server/repositories/notification.repository";

export async function getUnreadCount(userId: string): Promise<number> {
  if (userId === "system") return 0;
  await connectDB();
  return notificationRepository.countUnread(userId);
}

export async function getRecentNotifications(userId: string, limit = 5) {
  if (userId === "system") return [];
  await connectDB();
  return notificationRepository.findRecent(userId, limit);
}

export async function getNotificationsPageData(userId: string, page: number, pageSize = 15) {
  await connectDB();
  return notificationRepository.findAllPaginated(userId, page, pageSize);
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await connectDB();
  await notificationRepository.markRead(id, userId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await connectDB();
  await notificationRepository.markAllRead(userId);
}
