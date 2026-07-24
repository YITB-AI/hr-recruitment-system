import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { departmentRepository } from "@/server/repositories/department.repository";
import { statusRepository } from "@/server/repositories/status.repository";

const CSV_COLUMNS = [
  "Name",
  "Email",
  "Phone",
  "Department",
  "Designation",
  "Employee Type",
  "Manager Employee Code",
  "Joining Date",
  "Employment Type",
  "Status",
  "Basic Salary",
  "Gross Salary",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Downloadable blank template for the Employees > Import flow — one filled example row using this company's own real department/status names, since those are per-tenant dynamic data no static doc page could describe. */
export async function GET() {
  await connectDB();
  const { companyId } = await getCurrentUser();

  const [departments, statuses] = await Promise.all([
    departmentRepository.findAll(companyId, false),
    statusRepository.findAllForModule(companyId, "employee", false),
  ]);

  const exampleRow = [
    "John Doe",
    "john.doe@example.com",
    "+1 555 0100",
    departments[0]?.name ?? "Engineering",
    "Software Engineer",
    "",
    "",
    "2026-01-15",
    "full_time",
    statuses[0]?.name ?? "Active",
    "50000",
    "60000",
  ];

  const lines = [CSV_COLUMNS.join(","), exampleRow.map((cell) => escapeCsvCell(cell)).join(",")];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="employee-import-template.csv"',
    },
  });
}
