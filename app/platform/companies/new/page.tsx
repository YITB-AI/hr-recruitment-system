import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CreateCompanyWizard } from "@/features/settings/components/create-company-wizard";

export const metadata: Metadata = { title: "Create New Company" };
export const dynamic = "force-dynamic";

export default function CreateCompanyPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Create New Company"
        description="Provision a new tenant, grant its Model Access, and set its platform configuration."
      />
      <CreateCompanyWizard />
    </div>
  );
}
