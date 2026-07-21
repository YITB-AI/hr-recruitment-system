import { Briefcase, Send, FilePen, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { StatTrend } from "@/types/dashboard";

type JobStatsProps = {
  stats: {
    total: { value: number; trend: StatTrend };
    open: { value: number; trend: StatTrend };
    draft: { value: number; trend: StatTrend };
    closed: { value: number; trend: StatTrend };
  };
};

export function JobStats({ stats }: JobStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Jobs"
        value={stats.total.value}
        trend={stats.total.trend}
        periodLabel="last month"
        icon={Briefcase}
        iconClassName="bg-primary/10 text-primary"
      />
      <StatCard
        label="Open Jobs"
        value={stats.open.value}
        trend={stats.open.trend}
        periodLabel="last month"
        icon={Send}
        iconClassName="bg-[var(--status-interview)]/10 text-[var(--status-interview)]"
      />
      <StatCard
        label="Draft Jobs"
        value={stats.draft.value}
        trend={stats.draft.trend}
        periodLabel="last month"
        icon={FilePen}
        iconClassName="bg-[var(--status-new)]/10 text-[var(--status-new)]"
      />
      <StatCard
        label="Closed Jobs"
        value={stats.closed.value}
        trend={stats.closed.trend}
        periodLabel="last month"
        icon={CheckCircle2}
        iconClassName="bg-[var(--success)]/10 text-[var(--success)]"
      />
    </div>
  );
}
