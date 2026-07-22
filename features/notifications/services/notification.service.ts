import { after } from "next/server";
import { connectDB } from "@/server/db/connect";
import { notificationRepository, type NotificationRow } from "@/server/repositories/notification.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { resolveNotificationEntity, type NotificationEntityLink } from "@/features/notifications/services/notification-entity.service";
import { autoRepairResolvableOrphanedNotifications } from "@/features/settings/services/data-repair.service";
import { shouldRunRepairJob } from "@/lib/repair-throttle";
import { NOTIFICATION_TYPES, type NotificationType } from "@/constants/notification";
import type { UpdateNotificationPreferencesInput } from "@/validators/notification-preferences";

const REPAIR_INTERVAL_MS = 5 * 60 * 1000;

// Fire-and-forget, after the response has gone out — see the identical
// pattern/reasoning (incl. the throttle) in
// applicant.service.ts's triggerAutoRepairInBackground.
function triggerAutoRepairInBackground(): void {
  after(async () => {
    try {
      if (!(await shouldRunRepairJob("notifications", REPAIR_INTERVAL_MS))) return;
      await autoRepairResolvableOrphanedNotifications();
    } catch (error) {
      console.error("Auto-repair of orphaned notifications failed:", error);
    }
  });
}

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

export async function getNotificationsPageData(
  userId: string,
  page: number,
  pageSize = 15,
  type?: NotificationType,
  unreadOnly?: boolean,
) {
  await connectDB();
  triggerAutoRepairInBackground();
  return notificationRepository.findAllPaginated(userId, page, pageSize, type, unreadOnly);
}

/** Per-category counts backing the Notifications page's sidebar. */
export async function getNotificationCategoryCounts(userId: string) {
  await connectDB();
  return notificationRepository.countByType(userId);
}

export type NotificationDetail = { notification: NotificationRow; entityLink: NotificationEntityLink | null };

export async function getNotificationDetail(
  userId: string,
  companyId: string,
  id: string,
): Promise<NotificationDetail | null> {
  await connectDB();
  const notification = await notificationRepository.findByIdForUser(id, userId);
  if (!notification) return null;
  const entityLink = await resolveNotificationEntity(companyId, notification.entityType, notification.entityId);
  return { notification, entityLink };
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await connectDB();
  await notificationRepository.markRead(id, userId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await connectDB();
  await notificationRepository.markAllRead(userId);
}

/** Personal per-category preferences (Settings > Notifications) — every key defaults to enabled when unset. */
export async function getOwnNotificationPreferences(
  companyId: string,
  userId: string,
): Promise<Record<NotificationType, boolean>> {
  await connectDB();
  const raw = await userRepository.getOwnNotificationPreferences(companyId, userId);
  return Object.fromEntries(NOTIFICATION_TYPES.map((type) => [type, raw[type] !== false])) as Record<NotificationType, boolean>;
}

export async function updateOwnNotificationPreferences(
  companyId: string,
  userId: string,
  prefs: UpdateNotificationPreferencesInput,
): Promise<void> {
  await connectDB();
  await userRepository.updateOwnNotificationPreferences(companyId, userId, prefs);
}
