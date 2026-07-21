import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { jobRepository } from "@/server/repositories/job.repository";
import { getCurrentUser } from "@/lib/current-user";
import type { JobListFilters } from "@/server/repositories/job.repository";

const CSV_COLUMNS = [
  "Job ID",
  "Title",
  "Department",
  "Location",
  "Type",
  "Status",
  "Work Mode",
  "Experience Level",
  "Salary Min",
  "Salary Max",
  "Posted On",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Exports the currently filtered job list as CSV — respects the same status/department/search/archived query params as the Jobs page. */
export async function GET(request: Request) {
  await connectDB();
  const { companyId } = await getCurrentUser();

  const { searchParams } = new URL(request.url);
  const { rows } = await jobRepository.findAllForCompanyPaginated(companyId, {
    status: searchParams.get("status") || undefined,
    department: searchParams.get("department") || undefined,
    search: searchParams.get("search") || undefined,
    sort: (searchParams.get("sort") as JobListFilters["sort"]) || undefined,
    includeArchived: searchParams.get("archived") === "1",
    page: 1,
    pageSize: 10_000,
  });

  const lines = [
    CSV_COLUMNS.join(","),
    ...rows.map((row) =>
      [
        row.job_id,
        row.title,
        row.department,
        [row.city, row.state, row.country].filter(Boolean).join(", "),
        row.type ?? "",
        row.status,
        row.workMode ?? "",
        row.experienceLevel ?? "",
        row.salaryMin ?? "",
        row.salaryMax ?? "",
        row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : "",
      ]
        .map((cell) => escapeCsvCell(String(cell)))
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
