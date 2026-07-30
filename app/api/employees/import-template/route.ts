import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { departmentRepository } from "@/server/repositories/department.repository";
import { statusRepository } from "@/server/repositories/status.repository";
import { EMPLOYEE_COLUMNS } from "@/constants/employee-columns";

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Every column the import flow actually accepts (importKey !== null) —
// computed-only columns (Code, Department Code, Cost Center Code,
// Active/Inactive, Age, Years of Service, Documents, Creation Date) are
// server-derived and never appear on this template, same as they're never
// accepted by employee-import.service.ts. Same shared
// constants/employee-columns.ts list app/api/employees/export/route.ts
// builds its header row from — the two can no longer drift out of sync.
const IMPORT_COLUMNS = EMPLOYEE_COLUMNS.filter((col) => col.importKey);

/** Downloadable blank template for the Employees > Import flow — one filled example row using this company's own real department/status names for the required columns, since those are per-tenant dynamic data no static doc page could describe. Every other new column is optional and left blank in the example. */
export async function GET() {
  await connectDB();
  const { companyId } = await getCurrentUser();

  const [departments, statuses] = await Promise.all([
    departmentRepository.findAll(companyId, false),
    statusRepository.findAllForModule(companyId, "employee", false),
  ]);

  const exampleByImportKey: Record<string, string> = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 555 0100",
    department: departments[0]?.name ?? "Engineering",
    designation: "Software Engineer",
    joiningDate: "2026-01-15",
    employmentType: "full_time",
    employmentStatus: statuses[0]?.name ?? "Active",
    basicSalary: "50000",
    grossSalary: "60000",
  };

  const headerRow = IMPORT_COLUMNS.map((col) => col.header);
  const exampleRow = IMPORT_COLUMNS.map((col) => exampleByImportKey[col.importKey as string] ?? "");

  const lines = [headerRow.join(","), exampleRow.map((cell) => escapeCsvCell(cell)).join(",")];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="employee-import-template.csv"',
    },
  });
}
