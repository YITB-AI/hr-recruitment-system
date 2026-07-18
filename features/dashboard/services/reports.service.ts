import { connectDB } from "@/server/db/connect";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { getDashboardCounters } from "@/features/dashboard/services/dashboard.service";
import type { DashboardData } from "@/types/dashboard";
import type { ActivityLogRow } from "@/server/repositories/activity-log.repository";

export type ReportsPageData = {
  stats: DashboardData["stats"];
  applicantsByStatus: DashboardData["applicantsByStatus"];
  communication: DashboardData["communication"];
  activity: { data: ActivityLogRow[]; total: number };
};

export async function getReportsPageData(page: number, pageSize: number): Promise<ReportsPageData> {
  await connectDB();
  const { companyId } = await getCurrentUser();

  // Only ever needs the cheap counters subset (stats/applicantsByStatus/
  // communication) — previously called the full getDashboardData(), which
  // also computes recentActivity/upcomingInterviews/nextActions/
  // upcomingEmployeeActions (incl. a per-milestone template resolution)
  // only to discard all of it here.
  const [counters, activity] = await Promise.all([
    getDashboardCounters(),
    activityLogRepository.findAllPaginated(companyId, page, pageSize),
  ]);

  return {
    stats: counters.stats,
    applicantsByStatus: counters.applicantsByStatus,
    communication: counters.communication,
    activity,
  };
}
