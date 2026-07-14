import { connectDB } from "@/server/db/connect";
import { jobRepository } from "@/server/repositories/job.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { applicantFollowupRepository } from "@/server/repositories/applicant-followup.repository";
import { statusRepository } from "@/server/repositories/status.repository";
import { getCurrentUser } from "@/lib/current-user";
import { computeTrend, getWeekWindows } from "@/lib/trend";
import { PIPELINE_STATUSES, type ApplicantStatus } from "@/constants/applicant-status";
import type { DashboardData } from "@/types/dashboard";

export async function getDashboardData(): Promise<DashboardData> {
  await connectDB();
  const { companyId } = await getCurrentUser();

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
    recentActivity,
    upcomingInterviews,
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
    activityLogRepository.findRecent(companyId, 6),
    interviewRepository.findUpcoming(companyId, 5),
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
    communication: {
      calls: communicationCounts.call,
      emails: communicationCounts.email,
      messages: communicationCounts.sms + communicationCounts.whatsapp,
      pending: communicationCounts.pending,
      failed: communicationCounts.failed,
    },
  };
}
