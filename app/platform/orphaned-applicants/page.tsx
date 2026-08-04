import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { OrphanedApplicantsTable } from "@/features/settings/components/orphaned-applicants-table";
import { listOrphanedApplicants } from "@/features/settings/services/data-repair.service";
import { listCompaniesForMapping } from "@/features/settings/services/job-mapping.service";

export const metadata: Metadata = { title: "Orphaned Applicants" };
export const dynamic = "force-dynamic";

export default async function PlatformOrphanedApplicantsPage() {
  const [applicants, companies] = await Promise.all([listOrphanedApplicants(), listCompaniesForMapping()]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Orphaned Applicants"
        description="Applicants written by an external pipeline that couldn't be automatically resolved to a company."
      />
      <OrphanedApplicantsTable applicants={applicants} companies={companies} />
    </div>
  );
}
