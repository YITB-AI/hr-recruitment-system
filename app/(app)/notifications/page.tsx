import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { MarkAllReadButton } from "@/features/notifications/components/mark-all-read-button";
import { getNotificationsPageData } from "@/features/notifications/services/notification.service";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

type NotificationsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const user = await getCurrentUser();
  const data = await getNotificationsPageData(user.id, page, PAGE_SIZE);

  function buildHref(targetPage: number) {
    return `/notifications?page=${targetPage}`;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Notifications"
        description="Activity and alerts relevant to your account."
        actions={<MarkAllReadButton disabled={data.data.every((n) => n.read)} />}
      />

      <NotificationsList notifications={data.data} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} buildHref={buildHref} />
    </div>
  );
}
