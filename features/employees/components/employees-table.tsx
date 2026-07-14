import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmployeeRowActions } from "@/features/employees/components/employee-row-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import type { EmployeeListRow } from "@/server/repositories/employee.repository";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function EmployeesTable({ employees }: { employees: EmployeeListRow[] }) {
  if (employees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No employees found"
        description="Try adjusting your filters, or add a new employee."
      />
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="px-4 py-3 font-medium">Employee</th>
          <th className="px-4 py-3 font-medium">Department</th>
          <th className="px-4 py-3 font-medium">Designation</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Email</th>
          <th className="px-4 py-3 font-medium">Phone</th>
          <th className="px-4 py-3 font-medium">Joining Date</th>
          <th className="px-4 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {employees.map((employee) => (
          <tr key={employee._id} className="hover:bg-muted/30">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/employees/${employee._id}`} className="font-medium hover:underline">
                    {employee.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{employee.employeeCode}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-foreground/80">{employee.department}</td>
            <td className="px-4 py-3 text-foreground/80">{employee.designation}</td>
            <td className="px-4 py-3">
              <StatusBadge status={employee.employmentStatus} />
            </td>
            <td className="px-4 py-3 text-foreground/80">{employee.email}</td>
            <td className="px-4 py-3 text-foreground/80">{employee.phone ?? "—"}</td>
            <td className="px-4 py-3 text-foreground/80">
              {new Date(employee.joiningDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </td>
            <td className="px-4 py-3 text-right">
              <EmployeeRowActions employeeId={employee._id} name={employee.name} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
