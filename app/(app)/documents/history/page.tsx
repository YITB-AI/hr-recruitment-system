import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { DocumentHistoryFilters } from "@/features/documents/components/document-history-filters";
import { DocumentHistoryTable } from "@/features/documents/components/document-history-table";
import { listDocumentHistory } from "@/features/documents/services/document-history.service";
import { listTemplatesForPicker } from "@/features/documents/services/generate-document.service";
import type { GeneratedDocumentStatus } from "@/server/repositories/generated-document.repository";

export const metadata: Metadata = { title: "Document History" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type HistoryPageProps = {
  searchParams: Promise<{
    page?: string;
    templateId?: string;
    status?: string;
    recipientType?: string;
    dateFrom?: string;
    dateTo?: string;
    batchId?: string;
  }>;
};

export default async function DocumentHistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [templates, { rows, total }] = await Promise.all([
    listTemplatesForPicker(),
    listDocumentHistory(
      {
        templateId: params.templateId,
        status: params.status as GeneratedDocumentStatus | undefined,
        recipientType: params.recipientType as "employee" | "applicant" | undefined,
        batchId: params.batchId,
        dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
        dateTo: params.dateTo ? new Date(`${params.dateTo}T23:59:59.999`) : undefined,
      },
      page,
    ),
  ]);

  function buildHref(targetPage: number) {
    const query = new URLSearchParams();
    if (params.templateId) query.set("templateId", params.templateId);
    if (params.status) query.set("status", params.status);
    if (params.recipientType) query.set("recipientType", params.recipientType);
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.batchId) query.set("batchId", params.batchId);
    query.set("page", String(targetPage));
    return `/documents/history?${query.toString()}`;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Document History"
        description="Every document generated for employees and applicants, with status and audit trail."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/documents" />}>
            <ChevronLeft className="size-4" />
            Back to Generate
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <DocumentHistoryFilters templates={templates} />
        </div>
        <DocumentHistoryTable documents={rows} />
        <div className="border-t">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
        </div>
      </div>
    </div>
  );
}
