import { isToday, isYesterday, format } from "date-fns";
import type { NotificationRow } from "@/server/repositories/notification.repository";

export type NotificationDayGroup = { label: string; items: NotificationRow[] };

// Pure grouping of an already-sorted (createdAt desc) page — no new data
// needed. Only covers the current page, same as every other paginated list
// in this app; a day split across a page boundary isn't specially handled.
export function groupNotificationsByDay(notifications: NotificationRow[]): NotificationDayGroup[] {
  const groups: NotificationDayGroup[] = [];

  for (const notification of notifications) {
    const date = new Date(notification.createdAt);
    const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");

    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(notification);
    } else {
      groups.push({ label, items: [notification] });
    }
  }

  return groups;
}
