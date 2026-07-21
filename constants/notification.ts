// Client-safe: no Mongoose/model imports here.
export const NOTIFICATION_TYPES = ["application", "interview", "employee", "document", "system", "mention"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  application: "Applications",
  interview: "Interviews",
  employee: "Employees",
  document: "Documents",
  system: "System",
  // No @mention authoring exists anywhere in the app yet (no mentionedUserIds
  // field, no parsing) — this bucket ships structurally only and stays empty
  // until a future phase adds real mention support to Notes.
  mention: "Mentions",
};

export const NOTIFICATION_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];
