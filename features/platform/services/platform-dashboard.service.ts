import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { requirePlatformAdmin } from "@/lib/auth/permissions";
import { companyRepository, type CompanyRow } from "@/server/repositories/company.repository";
import { platformErrorLogRepository, type PlatformErrorLogRow } from "@/server/repositories/platform-error-log.repository";

export type PlatformDashboardData = {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalErrors: number;
  errorsLast7Days: number;
  recentCompanies: CompanyRow[];
  recentErrors: PlatformErrorLogRow[];
};

export async function getPlatformDashboardData(): Promise<PlatformDashboardData> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalCompanies, activeCompanies, suspendedCompanies, totalErrors, errorsLast7Days, recentCompanies, recentErrors] =
    await Promise.all([
      companyRepository.countTotal(),
      companyRepository.countByStatus("active"),
      companyRepository.countByStatus("suspended"),
      platformErrorLogRepository.countTotal(),
      platformErrorLogRepository.countSince(sevenDaysAgo),
      companyRepository.findRecent(5),
      platformErrorLogRepository.findRecent(5),
    ]);

  return { totalCompanies, activeCompanies, suspendedCompanies, totalErrors, errorsLast7Days, recentCompanies, recentErrors };
}
