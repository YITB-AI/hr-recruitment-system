import { connectDB } from "@/server/db/connect";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { getDashboardData } from "@/features/dashboard/services/dashboard.service";
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

  const [dashboardData, activity] = await Promise.all([
    getDashboardData(),
    activityLogRepository.findAllPaginated(companyId, page, pageSize),
  ]);

  return {
    stats: dashboardData.stats,
    applicantsByStatus: dashboardData.applicantsByStatus,
    communication: dashboardData.communication,
    activity,
  };
}
