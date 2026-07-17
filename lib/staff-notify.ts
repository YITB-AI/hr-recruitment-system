import { userRepository } from "@/server/repositories/user.repository";
import { notificationRepository } from "@/server/repositories/notification.repository";

// Shared by every system-triggered notification (AI-call outcomes, the
// applicant auto-repair path) — same Notification store the topbar bell and
// the dashboard's "Next Actions" card already read, so nothing new to wire
// up on the read side. admin/hr/recruiter are the roles that actually act
// on applicant pipeline events; interviewer is deliberately excluded.
const NOTIFY_ROLES = ["admin", "hr", "recruiter"] as const;

export async function notifyStaffForReview(companyId: string, title: string, message: string): Promise<void> {
  const recipients = await userRepository.findByRoles(companyId, [...NOTIFY_ROLES]);
  if (recipients.length === 0) return;
  await notificationRepository.createMany(
    recipients.map((recipient) => ({ companyId, userId: recipient._id, title, message })),
  );
}
