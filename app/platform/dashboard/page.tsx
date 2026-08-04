import Link from "next/link";
import type { Metadata } from "next";
import { Building2, CheckCircle2, PauseCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getPlatformDashboardData } from "@/features/platform/services/platform-dashboard.service";

export const metadata: Metadata = { title: "Global Dashboard" };
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function PlatformDashboardPage() {
  const data = await getPlatformDashboardData();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Global Dashboard" description="Platform-wide overview across every company." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Companies" value={data.totalCompanies} icon={Building2} href="/platform/companies" />
        <StatCard
          label="Active Companies"
          value={data.activeCompanies}
          icon={CheckCircle2}
          iconClassName="bg-[var(--success)]/10 text-[var(--success)]"
          href="/platform/companies"
        />
        <StatCard
          label="Suspended Companies"
          value={data.suspendedCompanies}
          icon={PauseCircle}
          iconClassName="bg-muted text-muted-foreground"
          href="/platform/companies"
        />
        <StatCard
          label="Errors (Last 7 Days)"
          value={data.errorsLast7Days}
          icon={ShieldAlert}
          iconClassName="bg-destructive/10 text-destructive"
          href="/platform/error-logs"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Companies</h3>
            <Link href="/platform/companies" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {data.recentCompanies.length === 0 ? (
            <EmptyState icon={Building2} title="No companies yet" description="Companies you create will show up here." />
          ) : (
            <ul className="divide-y">
              {data.recentCompanies.map((company) => (
                <li key={company._id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/platform/companies/${company._id}`} className="text-sm font-medium hover:underline">
                      {company.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {company.slug} · {formatDate(company.createdAt)}
                    </p>
                  </div>
                  <Badge variant={company.status === "active" ? "outline" : "destructive"} className="capitalize">
                    {company.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent System Errors</h3>
            <Link href="/platform/error-logs" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {data.recentErrors.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No errors logged" description="System is healthy — nothing to show." />
          ) : (
            <ul className="divide-y">
              {data.recentErrors.map((error) => (
                <li key={error._id} className="py-3">
                  <p className="text-sm font-medium">{error.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {error.source} · {error.companyName ?? "No company"} · {formatDate(error.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
