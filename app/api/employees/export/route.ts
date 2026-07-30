import { NextResponse, after } from "next/server";
import { connectDB } from "@/server/db/connect";
import { employeeRepository } from "@/server/repositories/employee.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import type { EmploymentStatus } from "@/constants/employee";

const CSV_COLUMNS = [
  "Employee Code",
  "Name",
  "Email",
  "Phone",
  "Department",
  "Designation",
  "Status",
  "Joining Date",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Exports the currently filtered employee list as CSV — respects the same status/department/search query params as the Employees page. */
export async function GET(request: Request) {
  await connectDB();
  const actor = await getCurrentUser();

  const { searchParams } = new URL(request.url);
  const { rows } = await employeeRepository.findAll(actor.companyId, {
    status: (searchParams.get("status") as EmploymentStatus) || undefined,
    department: searchParams.get("department") || undefined,
    groupId: searchParams.get("groupId") || undefined,
    regionId: searchParams.get("regionId") || undefined,
    stationId: searchParams.get("stationId") || undefined,
    search: searchParams.get("search") || undefined,
    page: 1,
    pageSize: 10_000,
  });

  // A bulk export has no single natural entity to point at — entityId is
  // omitted (see models/ActivityLog.ts's comment). Deferred via after()
  // since nothing in the response depends on this write having landed.
  after(() =>
    activityLogRepository
      .create({
        companyId: actor.companyId,
        actorId: resolveActorId(actor),
        actorName: actor.name,
        action: "employee.exported",
        entityType: "employee",
        message: `${actor.name} exported ${rows.length} employee record(s) to CSV`,
      })
      .catch((error) => console.error("Failed to log employee export:", error)),
  );

  const lines = [
    CSV_COLUMNS.join(","),
    ...rows.map((row) =>
      [
        row.employeeCode,
        row.name,
        row.email,
        row.phone ?? "",
        row.department,
        row.designation,
        row.employmentStatus,
        new Date(row.joiningDate).toISOString().slice(0, 10),
      ]
        .map((cell) => escapeCsvCell(String(cell)))
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
