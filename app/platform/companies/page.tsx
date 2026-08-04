import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CompaniesTable } from "@/features/settings/components/companies-table";
import { listCompanies } from "@/features/settings/services/company-management.service";

export const metadata: Metadata = { title: "Companies" };
export const dynamic = "force-dynamic";

export default async function PlatformCompaniesPage() {
  const companies = await listCompanies();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Companies" description="Create, activate, suspend, and manage every company on the platform." />
      <CompaniesTable companies={companies} />
    </div>
  );
}
