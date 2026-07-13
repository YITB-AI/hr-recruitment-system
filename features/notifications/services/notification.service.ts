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
