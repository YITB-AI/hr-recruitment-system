import { Briefcase, Users, ListChecks, UserCheck } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { DashboardStats } from "@/types/dashboard";

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={stats.totalJobs.label}
        value={stats.totalJobs.value}
        trend={stats.totalJobs.trend}
        icon={Briefcase}
        iconClassName="bg-[var(--status-new)]/10 text-[var(--status-new)]"
      />
      <StatCard
        label={stats.totalApplicants.label}
        value={stats.totalApplicants.value}
        trend={stats.totalApplicants.trend}
        icon={Users}
        iconClassName="bg-[var(--status-interview)]/10 text-[var(--status-interview)]"
      />
      <StatCard
        label={stats.shortlisted.label}
        value={stats.shortlisted.value}
        trend={stats.shortlisted.trend}
        icon={ListChecks}
        iconClassName="bg-[var(--status-shortlisted)]/10 text-[var(--status-shortlisted)]"
      />
      <StatCard
        label={stats.hired.label}
        value={stats.hired.value}
        trend={stats.hired.trend}
        icon={UserCheck}
        iconClassName="bg-[var(--status-screening)]/10 text-[var(--status-screening)]"
      />
    </div>
  );
}
