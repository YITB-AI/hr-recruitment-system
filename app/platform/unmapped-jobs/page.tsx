import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UnmappedJobsTable } from "@/features/settings/components/unmapped-jobs-table";
import { listUnmappedJobs, listCompaniesForMapping } from "@/features/settings/services/job-mapping.service";

export const metadata: Metadata = { title: "Unmapped Jobs" };
export const dynamic = "force-dynamic";

export default async function PlatformUnmappedJobsPage() {
  const [jobs, companies] = await Promise.all([listUnmappedJobs(), listCompaniesForMapping()]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Unmapped Jobs"
        description="Jobs synced by n8n with no company assigned yet — pick a company for each one."
      />
      <UnmappedJobsTable jobs={jobs} companies={companies} />
    </div>
  );
}
