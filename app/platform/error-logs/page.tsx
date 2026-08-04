import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldAlert } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/current-user";
import { connectDB } from "@/server/db/connect";
import { platformErrorLogRepository } from "@/server/repositories/platform-error-log.repository";

export const metadata: Metadata = { title: "System Error Logs" };
export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function PlatformErrorLogsPage() {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const { rows } = await platformErrorLogRepository.findAllPaginated({ page: 1, pageSize: 100 });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="System Error Logs" description="Errors aggregated across every company on the platform." />

      {rows.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No errors logged" description="Failures from webhooks and background jobs across every company will show up here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-foreground/80">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-foreground/80">{row.companyName ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground/80">{row.source}</td>
                  <td className="px-4 py-3 text-foreground/80">{row.action ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground/80">{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
