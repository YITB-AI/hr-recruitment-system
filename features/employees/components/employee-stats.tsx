import { Users, UserCheck, UserMinus, UserX } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { StatTrend } from "@/types/dashboard";

type EmployeeStatsProps = {
  stats: {
    total: { value: number; trend: StatTrend };
    active: { value: number; trend: StatTrend };
    onLeave: { value: number; trend: StatTrend | null };
    inactive: { value: number; trend: StatTrend };
  };
};

export function EmployeeStats({ stats }: EmployeeStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Employees"
        value={stats.total.value}
        trend={stats.total.trend}
        icon={Users}
        iconClassName="bg-[var(--status-interview)]/10 text-[var(--status-interview)]"
      />
      <StatCard
        label="Active Employees"
        value={stats.active.value}
        trend={stats.active.trend}
        icon={UserCheck}
        iconClassName="bg-[var(--status-new)]/10 text-[var(--status-new)]"
      />
      <StatCard
        label="On Leave"
        value={stats.onLeave.value}
        trend={stats.onLeave.trend ?? undefined}
        icon={UserMinus}
        iconClassName="bg-[var(--success)]/10 text-[var(--success)]"
      />
      <StatCard
        label="Inactive"
        value={stats.inactive.value}
        trend={stats.inactive.trend}
        icon={UserX}
        iconClassName="bg-destructive/10 text-destructive"
      />
    </div>
  );
}
