import { userRepository } from "@/server/repositories/user.repository";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { isNotificationTypeEnabled } from "@/lib/notification-preferences";
import { ACTIVITY_ENTITY_TYPES, type UserRole } from "@/models";
import type { NotificationType, NotificationPriority } from "@/constants/notification";

type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

export type NotifyOptions = {
  type: NotificationType;
  priority?: NotificationPriority;
  entityType?: ActivityEntityType;
  entityId?: string;
};

// Shared by every system-triggered notification (AI-call outcomes, the
// applicant auto-repair path, interview scheduling, document generation,
// employee creation) — same Notification store the topbar bell and the
// dashboard's "Next Actions" card already read, so nothing new to wire up on
// the read side. admin/hr/recruiter are the roles that actually act on
// applicant pipeline events; interviewer is deliberately excluded.
const NOTIFY_ROLES = ["admin", "hr", "recruiter"] as const;

async function fanOutNotification(
  companyId: string,
  roles: readonly UserRole[],
  title: string,
  message: string,
  options: NotifyOptions,
): Promise<void> {
  const recipients = await userRepository.findByRoles(companyId, [...roles]);
  if (recipients.length === 0) return;

  const prefsByUser = await userRepository.getNotificationPreferences(recipients.map((r) => r._id));
  const enabledRecipients = recipients.filter((r) => isNotificationTypeEnabled(prefsByUser.get(r._id), options.type));
  if (enabledRecipients.length === 0) return;

  await notificationRepository.createMany(
    enabledRecipients.map((recipient) => ({
      companyId,
      userId: recipient._id,
      title,
      message,
      type: options.type,
      priority: options.priority ?? "normal",
      entityType: options.entityType,
      entityId: options.entityId,
    })),
  );
}

export async function notifyStaffForReview(
  companyId: string,
  title: string,
  message: string,
  options: NotifyOptions,
): Promise<void> {
  return fanOutNotification(companyId, NOTIFY_ROLES, title, message, options);
}

// Narrower audience than notifyStaffForReview — recruiters don't need
// employee-HR alerts (e.g. a new employee record being created).
export async function notifyHrStaff(
  companyId: string,
  title: string,
  message: string,
  options: NotifyOptions,
): Promise<void> {
  return fanOutNotification(companyId, ["admin", "hr"], title, message, options);
}
