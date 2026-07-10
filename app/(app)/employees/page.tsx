import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { EmployeeStats } from "@/features/employees/components/employee-stats";
import { EmployeeFilters } from "@/features/employees/components/employee-filters";
import { EmployeesTable } from "@/features/employees/components/employees-table";
import { getEmployeesPageData } from "@/features/employees/services/employee.service";
import type { EmploymentStatus } from "@/constants/employee";

export const metadata: Metadata = { title: "Employees" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 8;

type EmployeesPageProps = {
  searchParams: Promise<{ page?: string; status?: string; department?: string; search?: string }>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const data = await getEmployeesPageData({
    page,
    pageSize: PAGE_SIZE,
    status: params.status as EmploymentStatus | undefined,
    department: params.department,
    search: params.search,
  });

  function buildHref(targetPage: number) {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.department) query.set("department", params.department);
    if (params.search) query.set("search", params.search);
    query.set("page", String(targetPage));
    return `/employees?${query.toString()}`;
  }

  const exportQuery = new URLSearchParams();
  if (params.status) exportQuery.set("status", params.status);
  if (params.department) exportQuery.set("department", params.department);
  if (params.search) exportQuery.set("search", params.search);
  const exportHref = `/api/employees/export?${exportQuery.toString()}`;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Employees"
        description="Manage your organization's employees."
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<a href={exportHref} />}>
              <Download className="size-4" />
              Export
            </Button>
            <Button nativeButton={false} render={<Link href="/employees/new" />}>
              <Plus className="size-4" />
              Add Employee
            </Button>
          </>
        }
      />

      <EmployeeStats stats={data.stats} />

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-4">
          <EmployeeFilters departments={data.departments} />
        </div>
        <EmployeesTable employees={data.rows} />
        <div className="border-t">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} buildHref={buildHref} />
        </div>
      </div>
    </div>
  );
}
