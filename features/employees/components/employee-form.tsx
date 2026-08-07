"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeFormSchema, type EmployeeFormInput } from "@/validators/employee";
import { createEmployeeAction, updateEmployeeAction } from "@/actions/employees";
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS, GENDER_OPTIONS, GENDER_LABELS } from "@/constants/employee";
import { EMPLOYEE_LOOKUP_KINDS, EMPLOYEE_LOOKUP_LABELS, EMPLOYEE_LOOKUP_FIELD, type EmployeeLookupKind } from "@/constants/employee-lookup";
import { COUNTRIES } from "@/constants/country";
import type { EmployeeRow, EmployeeDetailRow } from "@/server/repositories/employee.repository";
import type { StatusRow } from "@/server/repositories/status.repository";
import type { DepartmentRow } from "@/server/repositories/department.repository";
import type { EmployeeTypeRow } from "@/server/repositories/employee-type.repository";
import type { EmployeeLookupRow } from "@/server/repositories/employee-lookup.repository";

const TYPE_ITEMS = EMPLOYMENT_TYPES.map((t) => ({ value: t, label: EMPLOYMENT_TYPE_LABELS[t] }));
const NO_EMPLOYEE_TYPE = "";

function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

type OptionItem = { value: string; label: string };

function OptionSelect({
  control,
  name,
  label,
  items,
  placeholder = "None",
}: {
  control: Control<EmployeeFormInput>;
  name: FieldPath<EmployeeFormInput>;
  label: string;
  items: OptionItem[];
  placeholder?: string;
}) {
  const withNone = [{ value: "", label: placeholder }, ...items];
  const labelId = `${name}-label`;
  return (
    <div className="space-y-1.5">
      <Label id={labelId}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select items={withNone} value={(field.value as string) ?? ""} onValueChange={(v) => field.onChange(v ?? "")}>
            <SelectTrigger className="w-full" aria-labelledby={labelId}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {withNone.map((item) => (
                <SelectItem key={item.value || "none"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}

type EmployeeFormProps = {
  managers: EmployeeRow[];
  statuses: StatusRow[];
  departments: DepartmentRow[];
  employeeTypes: EmployeeTypeRow[];
  lookups: Record<EmployeeLookupKind, EmployeeLookupRow[]>;
  existing?: EmployeeDetailRow;
};

export function EmployeeForm({ managers, statuses, departments, employeeTypes, lookups, existing }: EmployeeFormProps) {
  const statusItems = statuses.map((s) => ({ value: s.key, label: s.name }));
  const departmentItems = departments.map((d) => ({ value: d._id, label: d.name }));
  const employeeTypeItems = employeeTypes.map((t) => ({ value: t._id, label: t.name }));
  const countryItems = COUNTRIES.map((c) => ({ value: c, label: c }));
  const genderItems = GENDER_OPTIONS.map((g) => ({ value: g, label: GENDER_LABELS[g] }));
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
      departmentId: existing?.departmentId ?? "",
      employeeTypeId: existing?.employeeType?._id ?? NO_EMPLOYEE_TYPE,
      designation: existing?.designation ?? "",
      managerId: existing?.manager?._id ?? "",
      joiningDate: existing ? toDateInputValue(existing.joiningDate) : "",
      employmentType: (existing?.employmentType as EmployeeFormInput["employmentType"]) ?? "full_time",
      employmentStatus: existing?.employmentStatus ?? "active",
      basicSalary: existing?.basicSalary ?? 0,
      grossSalary: existing?.grossSalary ?? 0,

      groupId: existing?.group?._id ?? "",
      regionId: existing?.region?._id ?? "",
      stationId: existing?.station?._id ?? "",
      costCenterId: existing?.costCenter?._id ?? "",
      vendorId: existing?.vendor?._id ?? "",
      roleTemplateId: existing?.roleTemplate?._id ?? "",
      payrollSetupId: existing?.payrollSetup?._id ?? "",
      areaId: existing?.area?._id ?? "",
      subDepartmentId: existing?.subDepartment?._id ?? "",

      dateOfBirth: toDateInputValue(existing?.dateOfBirth),
      gender: (existing?.gender as EmployeeFormInput["gender"]) ?? undefined,
      city: existing?.city ?? "",
      country: existing?.country ?? "",
      province: existing?.province ?? "",
      familyCode: existing?.familyCode ?? "",

      nationalIdNumber: existing?.nationalIdNumber ?? "",
      nationalIdExpiryDate: toDateInputValue(existing?.nationalIdExpiryDate),
      passportExpiryDate: toDateInputValue(existing?.passportExpiryDate),
      eobiEntryDate: toDateInputValue(existing?.eobiEntryDate),
      eobiRegistrationNumber: existing?.eobiRegistrationNumber ?? "",
      socialSecurityNumber: existing?.socialSecurityNumber ?? "",
      punchCode: existing?.punchCode ?? "",

      expectedProbationEndDate: toDateInputValue(existing?.expectedProbationEndDate),
      confirmationDate: toDateInputValue(existing?.confirmationDate),
      contractStartDate: toDateInputValue(existing?.contractStartDate),
      contractEndDate: toDateInputValue(existing?.contractEndDate),
      resignationDate: toDateInputValue(existing?.resignationDate),
      leavingDate: toDateInputValue(existing?.leavingDate),
      leavingReason: existing?.leavingReason ?? "",
      inactiveDate: toDateInputValue(existing?.inactiveDate),

      foodAllowance: existing?.foodAllowance != null ? String(existing.foodAllowance) : "",
      transportAllowance: existing?.transportAllowance != null ? String(existing.transportAllowance) : "",
      stipend: existing?.stipend != null ? String(existing.stipend) : "",
      alcanzaAllowance: existing?.alcanzaAllowance != null ? String(existing.alcanzaAllowance) : "",

      technicalNotes: existing?.technicalNotes ?? "",
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

  const managerItems = managers
    .filter((m) => m._id !== existing?._id)
    .map((m) => ({ value: m._id, label: `${m.name} — ${m.designation}` }));

  const lookupItems = (kind: EmployeeLookupKind) => lookups[kind].map((row) => ({ value: row._id, label: row.name }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Tabs defaultValue="personal">
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="employment">Employment Details</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email / Username</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            </div>
            <OptionSelect control={control} name="gender" label="Gender" items={genderItems} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="province">Province</Label>
              <Input id="province" {...register("province")} />
            </div>
            <OptionSelect control={control} name="country" label="Country" items={countryItems} placeholder="Select a country" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="familyCode">Family Code</Label>
              <Input id="familyCode" {...register("familyCode")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="punchCode">Punch Code</Label>
              <Input id="punchCode" {...register("punchCode")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationalIdNumber">CNIC / Emirates ID</Label>
              <Input id="nationalIdNumber" {...register("nationalIdNumber")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="nationalIdExpiryDate">CNIC / Emirates ID Expiry</Label>
              <Input id="nationalIdExpiryDate" type="date" {...register("nationalIdExpiryDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="passportExpiryDate">Passport Expiry Date</Label>
              <Input id="passportExpiryDate" type="date" {...register("passportExpiryDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eobiEntryDate">EOBI Entry Date</Label>
              <Input id="eobiEntryDate" type="date" {...register("eobiEntryDate")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eobiRegistrationNumber">EOBI Registration Number</Label>
              <Input id="eobiRegistrationNumber" {...register("eobiRegistrationNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="socialSecurityNumber">Social Security Number</Label>
              <Input id="socialSecurityNumber" {...register("socialSecurityNumber")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label id="departmentId-label">Department</Label>
              <Controller
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <Select items={departmentItems} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-labelledby="departmentId-label">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
            </div>
            <OptionSelect control={control} name="subDepartmentId" label="Sub Department" items={departmentItems} />
            <div className="space-y-1.5">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" {...register("designation")} />
              {errors.designation && <p className="text-xs text-destructive">{errors.designation.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label id="managerId-label">Reports To</Label>
              <Controller
                control={control}
                name="managerId"
                render={({ field }) => (
                  <Select
                    items={[{ value: "", label: "No manager" }, ...managerItems]}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v ?? "")}
                  >
                    <SelectTrigger className="w-full" aria-labelledby="managerId-label">
                      <SelectValue placeholder="No manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No manager</SelectItem>
                      {managerItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <OptionSelect control={control} name="employeeTypeId" label="Role Type" items={employeeTypeItems} />
            <OptionSelect control={control} name="roleTemplateId" label="Role Template" items={lookupItems("role_template")} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {EMPLOYEE_LOOKUP_KINDS.filter((k) => k !== "role_template" && k !== "payroll_setup").map((kind) => (
              <OptionSelect
                key={kind}
                control={control}
                name={EMPLOYEE_LOOKUP_FIELD[kind] as FieldPath<EmployeeFormInput>}
                label={EMPLOYEE_LOOKUP_LABELS[kind]}
                items={lookupItems(kind)}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="joiningDate">Joining Date</Label>
              <Input id="joiningDate" type="date" {...register("joiningDate")} />
              {errors.joiningDate && <p className="text-xs text-destructive">{errors.joiningDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label id="employmentType-label">Employment Type</Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select items={TYPE_ITEMS} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-labelledby="employmentType-label">
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
              <Label id="employmentStatus-label">Status</Label>
              <Controller
                control={control}
                name="employmentStatus"
                render={({ field }) => (
                  <Select items={statusItems} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-labelledby="employmentStatus-label">
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
              <Label htmlFor="expectedProbationEndDate">Expected Probation End Date</Label>
              <Input id="expectedProbationEndDate" type="date" {...register("expectedProbationEndDate")} />
              <p className="text-xs text-muted-foreground">Defaults to joining date + 3 months when left blank on create.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmationDate">Confirmation Date</Label>
              <Input id="confirmationDate" type="date" {...register("confirmationDate")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contractStartDate">Contract Start Date</Label>
              <Input id="contractStartDate" type="date" {...register("contractStartDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contractEndDate">Contract End Date</Label>
              <Input id="contractEndDate" type="date" {...register("contractEndDate")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="basicSalary">Monthly Salary</Label>
              <Input id="basicSalary" type="number" {...register("basicSalary", { valueAsNumber: true })} />
              {errors.basicSalary && <p className="text-xs text-destructive">{errors.basicSalary.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grossSalary">Gross Salary</Label>
              <Input id="grossSalary" type="number" {...register("grossSalary", { valueAsNumber: true })} />
              {errors.grossSalary && <p className="text-xs text-destructive">{errors.grossSalary.message}</p>}
            </div>
            <OptionSelect control={control} name="payrollSetupId" label="Payroll Setup" items={lookupItems("payroll_setup")} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="foodAllowance">Food Allowance</Label>
              <Input id="foodAllowance" type="number" {...register("foodAllowance")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transportAllowance">Transport Allowance</Label>
              <Input id="transportAllowance" type="number" {...register("transportAllowance")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stipend">Stipend</Label>
              <Input id="stipend" type="number" {...register("stipend")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alcanzaAllowance">Alcanza Allowance</Label>
              <Input id="alcanzaAllowance" type="number" {...register("alcanzaAllowance")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resignationDate">Resignation Date</Label>
              <Input id="resignationDate" type="date" {...register("resignationDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leavingDate">Leaving Date</Label>
              <Input id="leavingDate" type="date" {...register("leavingDate")} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="leavingReason">Leaving Reason</Label>
              <Input id="leavingReason" {...register("leavingReason")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inactiveDate">Inactive Date</Label>
              <Input id="inactiveDate" type="date" {...register("inactiveDate")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="technicalNotes">Technical Notes</Label>
            <Textarea id="technicalNotes" rows={5} {...register("technicalNotes")} />
          </div>
        </TabsContent>
      </Tabs>

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
