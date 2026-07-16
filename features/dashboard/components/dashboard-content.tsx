import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getDashboardData } from "@/features/dashboard/services/dashboard.service";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { CommunicationStatsRow } from "@/features/dashboard/components/communication-stats-row";
import { ApplicantsStatusChart } from "@/features/dashboard/components/applicants-status-chart";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import { UpcomingInterviews } from "@/features/dashboard/components/upcoming-interviews";
import { NextActions } from "@/features/dashboard/components/next-actions";
import { UpcomingEmployeeActions } from "@/features/dashboard/components/upcoming-employee-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
    >
      View all
      <ChevronRight className="size-3.5" />
    </Link>
  );
}

export async function DashboardContent() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <StatsGrid stats={data.stats} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Communication</h2>
        <CommunicationStatsRow stats={data.communication} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applicants Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicantsStatusChart data={data.applicantsByStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <ViewAllLink href="/reports" />
          </CardHeader>
          <CardContent>
            <RecentActivity items={data.recentActivity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Interviews</CardTitle>
            <ViewAllLink href="/interviews" />
          </CardHeader>
          <CardContent>
            <UpcomingInterviews items={data.upcomingInterviews} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Next Actions</CardTitle>
            <ViewAllLink href="/notifications" />
          </CardHeader>
          <CardContent>
            <NextActions items={data.nextActions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Employee Actions</CardTitle>
            <ViewAllLink href="/employees" />
          </CardHeader>
          <CardContent>
            <UpcomingEmployeeActions
              today={data.upcomingEmployeeActions.today}
              upcoming={data.upcomingEmployeeActions.upcoming}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
