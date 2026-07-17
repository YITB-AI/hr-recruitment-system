import { connectDB } from "@/server/db/connect";
import { jobRepository } from "@/server/repositories/job.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { applicantFollowupRepository } from "@/server/repositories/applicant-followup.repository";
import { employeeRepository } from "@/server/repositories/employee.repository";
import { statusRepository } from "@/server/repositories/status.repository";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { findTemplateForMilestone } from "@/features/documents/services/document-template.service";
import { getCurrentUser } from "@/lib/current-user";
import { computeTrend, getWeekWindows } from "@/lib/trend";
import { buildUpcomingEmployeeActions, type EmployeeActionItem } from "@/lib/employee-milestones";
import { PIPELINE_STATUSES, type ApplicantStatus } from "@/constants/applicant-status";
import { TEMPLATE_MILESTONE_TYPES } from "@/constants/document-template";
import type { DashboardData, UpcomingEmployeeActionItem } from "@/types/dashboard";

const UPCOMING_EMPLOYEE_ACTIONS_WINDOW_DAYS = 30;

// The cheap, frequently-changing subset of the dashboard — split out so the
// live-refresh polling (see actions/dashboard.ts) can re-fetch just this
// every ~30s without recomputing recentActivity/upcomingInterviews/
// nextActions/upcomingEmployeeActions on every tick.
async function computeCounters(companyId: string) {
  const { previousStart, currentStart, now } = getWeekWindows(new Date());

  const [
    totalJobs,
    jobsThisWeek,
    jobsPrevWeek,
    totalApplicants,
    applicantsThisWeek,
    applicantsPrevWeek,
    shortlistedCount,
    shortlistedThisWeek,
    shortlistedPrevWeek,
    hiredCount,
    hiredThisWeek,
    hiredPrevWeek,
    statusBreakdown,
    communicationCounts,
    applicantStatuses,
  ] = await Promise.all([
    // Job stays optional-companyId at the schema level (n8n-authored rows
    // may have none — see models/Job.ts), but these counts are scoped to
    // this company's own jobs (app-created ones, plus any n8n rows an admin
    // has mapped in via Settings -> Unmapped Jobs).
    jobRepository.countTotal(companyId),
    jobRepository.countCreatedBetween(companyId, currentStart, now),
    jobRepository.countCreatedBetween(companyId, previousStart, currentStart),
    applicantRepository.countTotal(companyId),
    applicantRepository.countCreatedBetween(companyId, currentStart, now),
    applicantRepository.countCreatedBetween(companyId, previousStart, currentStart),
    applicantRepository.countByStatus(companyId, "shortlisted"),
    applicantRepository.countByStatusUpdatedBetween(companyId, "shortlisted", currentStart, now),
    applicantRepository.countByStatusUpdatedBetween(companyId, "shortlisted", previousStart, currentStart),
    applicantRepository.countByStatus(companyId, "hired"),
    applicantRepository.countByStatusUpdatedBetween(companyId, "hired", currentStart, now),
    applicantRepository.countByStatusUpdatedBetween(companyId, "hired", previousStart, currentStart),
    applicantRepository.groupByStatus(companyId),
    applicantFollowupRepository.countByType(companyId),
    statusRepository.findAllForModule(companyId, "applicant"),
  ]);

  const statusByKey = new Map(applicantStatuses.map((s) => [s.key, s]));

  const countsByStatus = new Map<ApplicantStatus, number>(
    statusBreakdown.map((row) => [row.status, row.count]),
  );
  const pipelineTotal = PIPELINE_STATUSES.reduce(
    (sum, status) => sum + (countsByStatus.get(status) ?? 0),
    0,
  );

  const applicantsByStatus = PIPELINE_STATUSES.filter((status) => (countsByStatus.get(status) ?? 0) > 0).map(
    (status) => {
      const count = countsByStatus.get(status) ?? 0;
      const statusConfig = statusByKey.get(status);
      return {
        status,
        label: statusConfig?.name ?? status,
        count,
        percentage: pipelineTotal === 0 ? 0 : Math.round((count / pipelineTotal) * 1000) / 10,
        colorVar: statusConfig?.color ?? "#71717a",
      };
    },
  );

  return {
    stats: {
      totalJobs: {
        label: "Total Jobs",
        value: totalJobs,
        trend: computeTrend(jobsThisWeek, jobsPrevWeek),
      },
      totalApplicants: {
        label: "Total Applicants",
        value: totalApplicants,
        trend: computeTrend(applicantsThisWeek, applicantsPrevWeek),
      },
      shortlisted: {
        label: "Shortlisted",
        value: shortlistedCount,
        trend: computeTrend(shortlistedThisWeek, shortlistedPrevWeek),
      },
      hired: {
        label: "Hired",
        value: hiredCount,
        trend: computeTrend(hiredThisWeek, hiredPrevWeek),
      },
    },
    applicantsByStatus,
    communication: {
      calls: communicationCounts.call,
      emails: communicationCounts.email,
      messages: communicationCounts.sms + communicationCounts.whatsapp,
      pending: communicationCounts.pending,
      failed: communicationCounts.failed,
      inProgress: communicationCounts.inProgress,
    },
  };
}

// Polled every ~30s by the client (features/dashboard/components/dashboard-live-refresh.tsx)
// via getDashboardCountersAction — kept separate from getDashboardData so a
// tick never re-runs the more expensive recentActivity/upcomingInterviews/
// nextActions/upcomingEmployeeActions queries.
export async function getDashboardCounters() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return computeCounters(companyId);
}

export async function getDashboardData(): Promise<DashboardData> {
  await connectDB();
  const { companyId, id: userId } = await getCurrentUser();

  const { now } = getWeekWindows(new Date());

  const [counters, recentActivity, upcomingInterviews, nextActions, employeesForMilestones] = await Promise.all([
    computeCounters(companyId),
    activityLogRepository.findRecent(companyId, 6),
    interviewRepository.findUpcoming(companyId, 5),
    // "Next actions" — unread notifications for the current user, which is
    // exactly what the AI-call outcome fallback (call-outcome.service.ts)
    // creates when an outcome needs manual review. Reuses the same
    // Notification store the topbar bell already reads; no new storage.
    notificationRepository.findRecent(userId, 10),
    employeeRepository.findActiveForMilestones(companyId),
  ]);

  const { today: employeeActionsToday, upcoming: employeeActionsUpcoming } = buildUpcomingEmployeeActions(
    employeesForMilestones,
    now,
    UPCOMING_EMPLOYEE_ACTIONS_WINDOW_DAYS,
  );

  // Resolve at most 4 templates (one per milestone type), not one per
  // employee-action item — cheap even with many upcoming actions.
  const templateIdByMilestone = new Map<string, string | null>(
    await Promise.all(
      TEMPLATE_MILESTONE_TYPES.map(
        async (type) => [type, (await findTemplateForMilestone(companyId, type))?._id ?? null] as const,
      ),
    ),
  );
  function toUpcomingActionItem(item: EmployeeActionItem): UpcomingEmployeeActionItem {
    return {
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      department: item.department,
      designation: item.designation,
      action: item.action,
      milestoneType: item.milestoneType,
      templateId: templateIdByMilestone.get(item.milestoneType) ?? null,
      dueDate: item.dueDate.toISOString(),
    };
  }

  return {
    stats: counters.stats,
    applicantsByStatus: counters.applicantsByStatus,
    recentActivity: recentActivity.map((entry) => ({
      id: String(entry._id),
      message: entry.message,
      actorName: entry.actorName,
      createdAt: entry.createdAt.toISOString(),
    })),
    upcomingInterviews: upcomingInterviews.map((entry) => ({
      id: String(entry._id),
      applicantName: entry.applicantId?.name ?? "Unknown applicant",
      jobTitle: entry.jobId?.title ?? "Unknown role",
      scheduledAt: entry.scheduledAt.toISOString(),
    })),
    communication: counters.communication,
    nextActions: nextActions
      .filter((n) => !n.read)
      .slice(0, 5)
      .map((n) => ({
        id: n._id,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt.toISOString(),
      })),
    upcomingEmployeeActions: {
      today: employeeActionsToday.map(toUpcomingActionItem),
      upcoming: employeeActionsUpcoming.map(toUpcomingActionItem),
    },
  };
}
