"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { employeeFormSchema, type EmployeeFormInput } from "@/validators/employee";
import { createEmployee, updateEmployee, deleteEmployee } from "@/features/employees/services/employee.service";
import {
  validateEmployeeImport,
  commitEmployeeImport,
  type ImportRowResult,
  type ImportCommitResultItem,
} from "@/features/employees/services/employee-import.service";

export type ActionResult = { success: true } | { success: false; error: string };

function parseEmployeeForm(formData: FormData) {
  return employeeFormSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    departmentId: String(formData.get("departmentId") ?? ""),
    employeeTypeId: String(formData.get("employeeTypeId") ?? "") || undefined,
    designation: String(formData.get("designation") ?? ""),
    managerId: String(formData.get("managerId") ?? "") || undefined,
    joiningDate: String(formData.get("joiningDate") ?? ""),
    employmentType: String(formData.get("employmentType") ?? ""),
    employmentStatus: String(formData.get("employmentStatus") ?? ""),
    basicSalary: Number(formData.get("basicSalary")),
    grossSalary: Number(formData.get("grossSalary")),
  });
}

export async function createEmployeeAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseEmployeeForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let employeeId: string;
  try {
    const created = await createEmployee(parsed.data);
    employeeId = created._id;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create employee" };
  }

  revalidatePath("/employees");
  redirect(`/employees/${employeeId}`);
}

export async function updateEmployeeAction(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = parseEmployeeForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const updated = await updateEmployee(id, parsed.data);
    if (!updated) return { success: false, error: "Employee not found" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update employee" };
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  redirect(`/employees/${id}`);
}

export async function validateEmployeeImportAction(
  formData: FormData,
): Promise<{ success: true; rows: ImportRowResult[] } | { success: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose a .csv or .xlsx file first" };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows } = await validateEmployeeImport(buffer, file.name);
    return { success: true, rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to read this file" };
  }
}

export async function commitEmployeeImportAction(
  rows: Array<{ row: number; input: EmployeeFormInput }>,
): Promise<{ success: true; successCount: number; results: ImportCommitResultItem[] } | { success: false; error: string }> {
  try {
    const { successCount, results } = await commitEmployeeImport(rows);
    revalidatePath("/employees");
    return { success: true, successCount, results };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to import employees" };
  }
}

export async function deleteEmployeeAction(id: string): Promise<ActionResult> {
  try {
    await deleteEmployee(id);
    revalidatePath("/employees");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete employee" };
  }
}
