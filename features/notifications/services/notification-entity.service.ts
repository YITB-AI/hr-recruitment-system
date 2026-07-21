import { applicantRepository } from "@/server/repositories/applicant.repository";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { employeeRepository } from "@/server/repositories/employee.repository";
import { generatedDocumentRepository } from "@/server/repositories/generated-document.repository";
import { jobRepository } from "@/server/repositories/job.repository";

export type NotificationEntityLink = { label: string; href: string };

// Resolves a Notification's entityType/entityId into a "View X" deep link
// for the detail panel. No /interviews/[id] or /documents/[id] detail route
// exists in this app, so "interview" and "document" resolve THROUGH to the
// applicant/employee they're about, via fields their own repositories
// already populate — not new routes. "user"/"setting"/"auth" have no
// per-record detail page and just render no action button.
export async function resolveNotificationEntity(
  companyId: string,
  entityType: string | null,
  entityId: string | null,
): Promise<NotificationEntityLink | null> {
  if (!entityType || !entityId) return null;

  switch (entityType) {
    case "applicant": {
      const applicant = await applicantRepository.findById(companyId, entityId);
      return applicant ? { label: `View ${applicant.name}`, href: `/applicants/${applicant._id}` } : null;
    }
    case "interview": {
      const interview = await interviewRepository.findById(companyId, entityId);
      return interview?.applicantId
        ? { label: `View ${interview.applicantId.name}`, href: `/applicants/${interview.applicantId._id}` }
        : null;
    }
    case "employee": {
      const employee = await employeeRepository.findById(companyId, entityId);
      return employee ? { label: `View ${employee.name}`, href: `/employees/${employee._id}` } : null;
    }
    case "document": {
      const doc = await generatedDocumentRepository.findById(companyId, entityId);
      if (!doc) return null;
      if (doc.employee) return { label: `View ${doc.employee.name}`, href: `/employees/${doc.employee._id}` };
      if (doc.applicant) return { label: `View ${doc.applicant.name}`, href: `/applicants/${doc.applicant._id}` };
      return null;
    }
    case "job": {
      const job = await jobRepository.findById(companyId, entityId);
      return job ? { label: `View ${job.title}`, href: `/jobs/${job._id}` } : null;
    }
    default:
      return null;
  }
}
