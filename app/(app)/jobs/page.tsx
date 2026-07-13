import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { JobsTable } from "@/features/jobs/components/jobs-table";
import { getJobsPageData } from "@/features/jobs/services/job.service";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await getJobsPageData();

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
        <JobsTable jobs={jobs} />
      </div>
    </div>
  );
}
