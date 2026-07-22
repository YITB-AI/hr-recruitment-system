import type { NotificationType } from "@/constants/notification";

// A missing key (including for a NotificationType added after a user's
// preferences were last saved) means enabled — matching the same
// "absent = default on" convention already used for Notification.type/
// priority on legacy rows (see notification.repository.ts's serializer).
export function isNotificationTypeEnabled(
  prefs: Partial<Record<NotificationType, boolean>> | undefined,
  type: NotificationType,
): boolean {
  return prefs?.[type] !== false;
}
