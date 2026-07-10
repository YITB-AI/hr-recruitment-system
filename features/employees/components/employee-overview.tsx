import { Mail, Phone, Building2, Calendar, Briefcase, Wallet, UserCog } from "lucide-react";
import { EMPLOYMENT_TYPE_LABELS } from "@/constants/employee";
import type { EmployeeDetailRow } from "@/server/repositories/employee.repository";

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function EmployeeOverview({ employee }: { employee: EmployeeDetailRow }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Personal Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={Mail} label="Email" value={employee.email} />
          <Field icon={Phone} label="Phone" value={employee.phone ?? "Not provided"} />
          <Field icon={Building2} label="Department" value={employee.department} />
          <Field icon={Briefcase} label="Designation" value={employee.designation} />
          <Field
            icon={Calendar}
            label="Joining Date"
            value={new Date(employee.joiningDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
          <Field icon={UserCog} label="Reports To" value={employee.manager?.name ?? "No manager"} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Employment Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            icon={Briefcase}
            label="Employment Type"
            value={EMPLOYMENT_TYPE_LABELS[employee.employmentType as keyof typeof EMPLOYMENT_TYPE_LABELS] ?? employee.employmentType}
          />
          <Field icon={Wallet} label="Basic Salary" value={`Rs. ${employee.basicSalary.toLocaleString()}`} />
          <Field icon={Wallet} label="Gross Salary" value={`Rs. ${employee.grossSalary.toLocaleString()}`} />
        </div>
      </div>
    </div>
  );
}
