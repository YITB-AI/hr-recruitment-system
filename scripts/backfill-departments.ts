import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { connectDB } from "@/server/db/connect";
import { Employee } from "@/models/Employee";
import { Department } from "@/models/Department";

// Backfills a real Department row (models/Department.ts) for every distinct
// free-string Employee.department value, per company, and sets
// Employee.departmentId to point at it — bridges employees created before
// the Department master existed. Idempotent (skips employees that already
// have a departmentId) and dry-run by default; pass --confirm to write.
// Never invoked automatically; mutates production data, run manually with
// the operator watching the output — same convention as migrate-tenancy.ts.

async function main() {
  const confirm = process.argv.includes("--confirm");
  await connectDB();

  console.log(`\n=== Department backfill ${confirm ? "(LIVE RUN)" : "(DRY RUN — pass --confirm to write)"} ===\n`);

  const employeesMissing = await Employee.find({ departmentId: { $exists: false } })
    .select("companyId department")
    .lean<Array<{ _id: unknown; companyId: unknown; department: string }>>();

  if (employeesMissing.length === 0) {
    console.log("Nothing to backfill — every employee already has a departmentId. Exiting.");
    process.exit(0);
  }

  const byCompany = new Map<string, Array<{ _id: unknown; department: string }>>();
  for (const employee of employeesMissing) {
    const companyKey = String(employee.companyId ?? "none");
    const list = byCompany.get(companyKey) ?? [];
    list.push(employee);
    byCompany.set(companyKey, list);
  }

  let totalDepartmentsToCreate = 0;
  let totalEmployeesToUpdate = employeesMissing.length;
  for (const [companyId, employees] of byCompany) {
    const distinctNames = [...new Set(employees.map((e) => e.department.trim()).filter(Boolean))];
    console.log(`Company ${companyId}: ${employees.length} employee(s), ${distinctNames.length} distinct department name(s): ${distinctNames.join(", ")}`);
    totalDepartmentsToCreate += distinctNames.length;
  }

  console.log(`\nWould create up to ${totalDepartmentsToCreate} department row(s) (reusing any that already exist by name) and update ${totalEmployeesToUpdate} employee(s).`);

  if (!confirm) {
    console.log("\nDry run only — no changes written. Re-run with --confirm to apply.\n");
    process.exit(0);
  }

  let departmentsCreated = 0;
  let employeesUpdated = 0;

  for (const [companyId, employees] of byCompany) {
    if (companyId === "none") {
      console.log("Skipping employees with no companyId — resolve tenancy first.");
      continue;
    }

    const nameToId = new Map<string, string>();
    const distinctNames = [...new Set(employees.map((e) => e.department.trim()).filter(Boolean))];

    for (const name of distinctNames) {
      const existing = await Department.findOne({
        companyId,
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        deletedAt: { $exists: false },
      });
      if (existing) {
        nameToId.set(name, String(existing._id));
        continue;
      }
      const maxOrderRow = await Department.findOne({ companyId }).sort({ order: -1 }).select("order").lean<{ order: number } | null>();
      const created = await Department.create({ companyId, name, order: (maxOrderRow?.order ?? -1) + 1, isActive: true });
      nameToId.set(name, String(created._id));
      departmentsCreated++;
    }

    for (const employee of employees) {
      const departmentId = nameToId.get(employee.department.trim());
      if (!departmentId) continue;
      await Employee.updateOne({ _id: employee._id }, { departmentId });
      employeesUpdated++;
    }
  }

  console.log(`\n=== Backfill complete: ${departmentsCreated} department(s) created, ${employeesUpdated} employee(s) updated ===\n`);
  process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
