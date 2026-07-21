import Link from "next/link";
import type { Metadata } from "next";
import { Bell, Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationSidebar } from "@/features/notifications/components/notification-sidebar";
import { NotificationRow } from "@/features/notifications/components/notification-row";
import { NotificationDetailPanel } from "@/features/notifications/components/notification-detail-panel";
import { MarkAllReadButton } from "@/features/notifications/components/mark-all-read-button";
import {
  getNotificationsPageData,
  getNotificationCategoryCounts,
  getNotificationDetail,
  getUnreadCount,
} from "@/features/notifications/services/notification.service";
import { groupNotificationsByDay } from "@/features/notifications/lib/group-by-day";
import { NOTIFICATION_TYPES, type NotificationType } from "@/constants/notification";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

type NotificationsPageProps = {
  searchParams: Promise<{ page?: string; type?: string; unread?: string; selected?: string }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const type = (NOTIFICATION_TYPES as readonly string[]).includes(params.type ?? "") ? (params.type as NotificationType) : undefined;
  const showUnreadOnly = params.unread === "1";

  const user = await getCurrentUser();
  const [data, counts, totalUnread] = await Promise.all([
    getNotificationsPageData(user.id, page, PAGE_SIZE, type, showUnreadOnly),
    getNotificationCategoryCounts(user.id),
    getUnreadCount(user.id),
  ]);

  const totalCount = counts.reduce((sum, c) => sum + c.count, 0);
  const dayGroups = groupNotificationsByDay(data.data);
  const detail = params.selected ? await getNotificationDetail(user.id, user.companyId, params.selected) : null;

  function buildHref(targetPage: number) {
    const query = new URLSearchParams();
    if (type) query.set("type", type);
    if (showUnreadOnly) query.set("unread", "1");
    query.set("page", String(targetPage));
    return `/notifications?${query.toString()}`;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Notifications"
        description="Stay updated with important activities and alerts."
        actions={
          <div className="flex items-center gap-2">
            <MarkAllReadButton disabled={totalUnread === 0} />
            <Button variant="outline" nativeButton={false} render={<Link href="/settings?tab=notifications" />}>
              <SettingsIcon className="size-4" />
              Notification Settings
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr_340px]">
        <div className="hidden lg:block">
          <NotificationSidebar
            activeType={type}
            showUnreadOnly={showUnreadOnly}
            totalCount={totalCount}
            totalUnread={totalUnread}
            counts={counts}
          />
        </div>

        <div className="space-y-4">
          {dayGroups.length === 0 ? (
            <div className="rounded-2xl border bg-card">
              <EmptyState icon={Bell} title="No notifications" description="New activity will show up here in real time." />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              {dayGroups.map((group) => (
                <div key={group.label}>
                  <div className="border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">{group.label}</div>
                  <div className="divide-y">
                    {group.items.map((notification) => (
                      <NotificationRow key={notification._id} notification={notification} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} buildHref={buildHref} itemLabel="notifications" />
        </div>

        <div className="hidden lg:block">
          {detail ? (
            <NotificationDetailPanel detail={detail} />
          ) : (
            <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Select a notification to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
