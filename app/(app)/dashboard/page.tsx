import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardContent } from "@/features/dashboard/components/dashboard-content";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function formatWeekRange(now: Date) {
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} - ${fmt(now)}, ${now.getFullYear()}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${firstName}! Here's what's happening today.`}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            {formatWeekRange(new Date())}
          </span>
        }
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
