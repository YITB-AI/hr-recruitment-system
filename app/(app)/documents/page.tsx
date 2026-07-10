import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateDocumentWizard } from "@/features/documents/components/generate-document-wizard";
import { PopularTemplates } from "@/features/documents/components/popular-templates";
import { RecentDocumentsTable } from "@/features/documents/components/recent-documents-table";
import {
  listTemplatesForPicker,
  listEmployeesForPicker,
  listRecentDocuments,
} from "@/features/documents/services/generate-document.service";

export const metadata: Metadata = { title: "Generate Document" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  const { templateId } = await searchParams;
  const [templates, employees, recentDocuments] = await Promise.all([
    listTemplatesForPicker(),
    listEmployeesForPicker(),
    listRecentDocuments(),
  ]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Generate Document"
        description="Create and manage official documents for employees."
        actions={
          <Button nativeButton={false} render={<Link href="/templates/new" />}>
            <Plus className="size-4" />
            New Template
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Document Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerateDocumentWizard key={templateId ?? "default"} templates={templates} employees={employees} initialTemplateId={templateId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Popular Templates</CardTitle>
            <Link href="/templates" className="text-xs font-medium text-primary hover:underline">
              View all templates
            </Link>
          </CardHeader>
          <CardContent>
            <PopularTemplates templates={templates} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <RecentDocumentsTable documents={recentDocuments} />
        </CardContent>
      </Card>
    </div>
  );
}
