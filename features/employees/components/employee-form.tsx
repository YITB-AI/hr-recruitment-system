"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeFormSchema, type EmployeeFormInput } from "@/validators/employee";
import { createEmployeeAction, updateEmployeeAction } from "@/actions/employees";
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS } from "@/constants/employee";
import type { EmployeeRow, EmployeeDetailRow } from "@/server/repositories/employee.repository";
import type { StatusRow } from "@/server/repositories/status.repository";

const TYPE_ITEMS = EMPLOYMENT_TYPES.map((t) => ({ value: t, label: EMPLOYMENT_TYPE_LABELS[t] }));

type EmployeeFormProps = {
  managers: EmployeeRow[];
  statuses: StatusRow[];
  existing?: EmployeeDetailRow;
};

export function EmployeeForm({ managers, statuses, existing }: EmployeeFormProps) {
  const statusItems = statuses.map((s) => ({ value: s.key, label: s.name }));
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormInput>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: existing?.name ?? "",
      email: existing?.email ?? "",
      phone: existing?.phone ?? "",
      department: existing?.department ?? "",
      designation: existing?.designation ?? "",
      managerId: existing?.manager?._id ?? "",
      joiningDate: existing ? new Date(existing.joiningDate).toISOString().slice(0, 10) : "",
      employmentType: (existing?.employmentType as EmployeeFormInput["employmentType"]) ?? "full_time",
      employmentStatus: existing?.employmentStatus ?? "active",
      basicSalary: existing?.basicSalary ?? 0,
      grossSalary: existing?.grossSalary ?? 0,
    },
  });

  async function onSubmit(values: EmployeeFormInput) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) formData.set(key, String(value));
    }

    const result = existing
      ? await updateEmployeeAction(existing._id, formData)
      : await createEmployeeAction(formData);

    // On success the action calls redirect(), which throws internally and
    // never returns here — only the failure path produces a value.
    if (result && !result.success) toast.error(result.error);
  }

  const managerItems = [
    { value: "", label: "No manager" },
    ...managers.filter((m) => m._id !== existing?._id).map((m) => ({ value: m._id, label: `${m.name} — ${m.designation}` })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="department">Department</Label>
          <Input id="department" {...register("department")} />
          {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="designation">Designation</Label>
          <Input id="designation" {...register("designation")} />
          {errors.designation && <p className="text-xs text-destructive">{errors.designation.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Reports To</Label>
          <Controller
            control={control}
            name="managerId"
            render={({ field }) => (
              <Select items={managerItems} value={field.value ?? ""} onValueChange={(v) => field.onChange(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No manager" />
                </SelectTrigger>
                <SelectContent>
                  {managerItems.map((item) => (
                    <SelectItem key={item.value || "none"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="joiningDate">Joining Date</Label>
          <Input id="joiningDate" type="date" {...register("joiningDate")} />
          {errors.joiningDate && <p className="text-xs text-destructive">{errors.joiningDate.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Employment Type</Label>
          <Controller
            control={control}
            name="employmentType"
            render={({ field }) => (
              <Select items={TYPE_ITEMS} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {EMPLOYMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Controller
            control={control}
            name="employmentStatus"
            render={({ field }) => (
              <Select items={statusItems} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.key} value={status.key}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="basicSalary">Basic Salary</Label>
          <Input id="basicSalary" type="number" {...register("basicSalary", { valueAsNumber: true })} />
          {errors.basicSalary && <p className="text-xs text-destructive">{errors.basicSalary.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="grossSalary">Gross Salary</Label>
          <Input id="grossSalary" type="number" {...register("grossSalary", { valueAsNumber: true })} />
          {errors.grossSalary && <p className="text-xs text-destructive">{errors.grossSalary.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : existing ? "Save Changes" : "Add Employee"}
        </Button>
      </div>
    </form>
  );
}
