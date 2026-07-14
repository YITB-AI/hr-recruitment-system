import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { JobFilters } from "@/features/jobs/components/job-filters";
import { JobsTable } from "@/features/jobs/components/jobs-table";
import { getJobsPageData } from "@/features/jobs/services/job.service";
import type { JobListFilters } from "@/server/repositories/job.repository";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type JobsPageProps = {
  searchParams: Promise<{ page?: string; status?: string; search?: string; sort?: string; archived?: string }>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const data = await getJobsPageData({
    page,
    pageSize: PAGE_SIZE,
    status: params.status,
    search: params.search,
    sort: params.sort as JobListFilters["sort"],
    includeArchived: params.archived === "1",
  });

  function buildHref(targetPage: number) {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    if (params.sort) query.set("sort", params.sort);
    if (params.archived) query.set("archived", params.archived);
    query.set("page", String(targetPage));
    return `/jobs?${query.toString()}`;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Jobs"
        description="Manage your open job postings."
        actions={
          <Button nativeButton={false} render={<Link href="/jobs/new" />}>
            <Plus className="size-4" />
            Create Job
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <JobFilters />
        </div>
        <JobsTable jobs={data.rows} />
        <div className="border-t">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} buildHref={buildHref} />
        </div>
      </div>
    </div>
  );
}
