import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { requirePlatformAdmin } from "@/lib/auth/permissions";
import { companyRepository, type CompanyRow } from "@/server/repositories/company.repository";
import { platformErrorLogRepository, type PlatformErrorLogRow } from "@/server/repositories/platform-error-log.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { getWeekWindows, computeTrend } from "@/lib/trend";
import type { StatTrend } from "@/types/dashboard";

export type PlatformDashboardData = {
  totalCompanies: number;
  // Only Total Companies gets a colored trend arrow -- "more" is
  // unambiguously growth/good here, which is what StatCard's up=green/
  // down=red styling assumes. Errors don't get one: "more errors" would
  // render as a green "up" arrow under that same styling, which is
  // backwards for a metric where fewer is better -- rather than ship a
  // misleading signal, this card stays a plain count.
  totalCompaniesTrend: StatTrend;
  activeCompanies: number;
  suspendedCompanies: number;
  totalErrors: number;
  errorsLast7Days: number;
  platformAdmins: number;
  recentCompanies: CompanyRow[];
  recentErrors: PlatformErrorLogRow[];
};

export async function getPlatformDashboardData(): Promise<PlatformDashboardData> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const { previousStart, currentStart, now } = getWeekWindows(new Date());
  const sevenDaysAgo = currentStart;

  const [
    totalCompanies,
    activeCompanies,
    suspendedCompanies,
    totalErrors,
    errorsLast7Days,
    companiesThisWeek,
    companiesLastWeek,
    platformAdmins,
    recentCompanies,
    recentErrors,
  ] = await Promise.all([
    companyRepository.countTotal(),
    companyRepository.countByStatus("active"),
    companyRepository.countByStatus("suspended"),
    platformErrorLogRepository.countTotal(),
    platformErrorLogRepository.countSince(sevenDaysAgo),
    companyRepository.countCreatedBetween(currentStart, now),
    companyRepository.countCreatedBetween(previousStart, currentStart),
    userRepository.countPlatformAdmins(),
    companyRepository.findRecent(5),
    platformErrorLogRepository.findRecent(5),
  ]);

  return {
    totalCompanies,
    totalCompaniesTrend: computeTrend(companiesThisWeek, companiesLastWeek),
    activeCompanies,
    suspendedCompanies,
    totalErrors,
    errorsLast7Days,
    platformAdmins,
    recentCompanies,
    recentErrors,
  };
}
