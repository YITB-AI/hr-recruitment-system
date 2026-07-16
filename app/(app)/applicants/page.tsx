import Link from "next/link";
import type { Metadata } from "next";
import { LayoutGrid, Table2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { ApplicantFilters } from "@/features/applicants/components/applicant-filters";
import { ApplicantsListView } from "@/features/applicants/components/applicants-list-view";
import { ApplicantsKanbanBoard } from "@/features/applicants/components/applicants-kanban-board";
import { CreateApplicationDialog } from "@/features/applicants/components/create-application-dialog";
import { getApplicantsPageData, getApplicantsKanbanData } from "@/features/applicants/services/applicant.service";
import { listSavedViews } from "@/features/applicants/services/saved-view.service";
import { listActiveStatuses } from "@/features/settings/services/status-management.service";
import { StatusConfigProvider } from "@/components/shared/status-config-provider";
import { jobRepository } from "@/server/repositories/job.repository";
import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import type { ApplicantStatus } from "@/constants/applicant-status";

export const metadata: Metadata = { title: "Applicants" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type ApplicantsPageProps = {
  searchParams: Promise<{
    view?: string;
    page?: string;
    status?: string;
    jobId?: string;
    source?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    scoreMin?: string;
    scoreMax?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
};

export default async function ApplicantsPage({ searchParams }: ApplicantsPageProps) {
  const params = await searchParams;
  const isKanban = params.view === "kanban";
  const page = Math.max(1, Number(params.page) || 1);
  const sortBy = params.sortBy === "score" ? "score" : undefined;
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";

  const sharedFilters = {
    jobId: params.jobId,
    source: params.source,
    search: params.search,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(`${params.dateTo}T23:59:59.999`) : undefined,
    scoreMin: params.scoreMin ? Number(params.scoreMin) : undefined,
    scoreMax: params.scoreMax ? Number(params.scoreMax) : undefined,
  };

  await connectDB();
  const actor = await getCurrentUser();
  const [tableData, kanbanData, savedViews, jobs, applicantStatuses] = await Promise.all([
    isKanban
      ? Promise.resolve(null)
      : getApplicantsPageData({
          ...sharedFilters,
          page,
          pageSize: PAGE_SIZE,
          status: params.status as ApplicantStatus | undefined,
          sortBy,
          sortDir,
        }),
    isKanban ? getApplicantsKanbanData(sharedFilters) : Promise.resolve(null),
    listSavedViews(),
    jobRepository.findAllForPicker(actor.companyId),
    listActiveStatuses("applicant"),
  ]);

  function buildBaseQuery() {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.jobId) query.set("jobId", params.jobId);
    if (params.source) query.set("source", params.source);
    if (params.search) query.set("search", params.search);
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.scoreMin) query.set("scoreMin", params.scoreMin);
    if (params.scoreMax) query.set("scoreMax", params.scoreMax);
    return query;
  }

  function buildHref(targetPage: number) {
    const query = buildBaseQuery();
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortDir) query.set("sortDir", params.sortDir);
    query.set("page", String(targetPage));
    return `/applicants?${query.toString()}`;
  }

  const nextScoreSortDir = sortBy === "score" && sortDir === "asc" ? "desc" : "asc";
  const scoreSortQuery = buildBaseQuery();
  scoreSortQuery.set("sortBy", "score");
  scoreSortQuery.set("sortDir", nextScoreSortDir);
  scoreSortQuery.set("page", "1");
  const scoreSortHref = `/applicants?${scoreSortQuery.toString()}`;

  const tableViewQuery = buildBaseQuery();
  tableViewQuery.delete("view");
  const kanbanViewQuery = buildBaseQuery();
  kanbanViewQuery.set("view", "kanban");

  return (
    <StatusConfigProvider statuses={applicantStatuses}>
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Applicants"
        description="Manage and review all applicants."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant={isKanban ? "ghost" : "secondary"}
                size="sm"
                nativeButton={false}
                render={<Link href={`/applicants?${tableViewQuery.toString()}`} />}
              >
                <Table2 className="size-4" />
                Table
              </Button>
              <Button
                variant={isKanban ? "secondary" : "ghost"}
                size="sm"
                nativeButton={false}
                render={<Link href={`/applicants?${kanbanViewQuery.toString()}`} />}
              >
                <LayoutGrid className="size-4" />
                Kanban
              </Button>
            </div>
            <CreateApplicationDialog jobs={jobs} />
          </div>
        }
      />

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <ApplicantFilters jobs={jobs} savedViews={savedViews} />
        </div>
        {isKanban && kanbanData ? (
          <ApplicantsKanbanBoard initialData={kanbanData} />
        ) : tableData ? (
          <>
            <ApplicantsListView
              applicants={tableData.rows}
              sortBy={sortBy}
              sortDir={sortDir}
              scoreSortHref={scoreSortHref}
            />
            <div className="border-t">
              <Pagination page={page} pageSize={PAGE_SIZE} total={tableData.total} buildHref={buildHref} />
            </div>
          </>
        ) : null}
      </div>
    </div>
    </StatusConfigProvider>
  );
}
