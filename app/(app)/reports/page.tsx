import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { CommunicationStatsRow } from "@/features/dashboard/components/communication-stats-row";
import { ApplicantsStatusChart } from "@/features/dashboard/components/applicants-status-chart";
import { ActivityLogTable } from "@/features/dashboard/components/activity-log-table";
import { getReportsPageData } from "@/features/dashboard/services/reports.service";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

type ReportsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const data = await getReportsPageData(page, PAGE_SIZE);

  function buildHref(targetPage: number) {
    return `/reports?page=${targetPage}`;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Reports"
        description="Recruitment activity and hiring pipeline at a glance."
      />

      <StatsGrid stats={data.stats} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Communication</h2>
        <CommunicationStatsRow stats={data.communication} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Applicants Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicantsStatusChart data={data.applicantsByStatus} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ActivityLogTable items={data.activity.data} />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.activity.total}
              buildHref={buildHref}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
