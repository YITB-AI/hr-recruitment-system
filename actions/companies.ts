"use server";

import { revalidatePath } from "next/cache";
import { createCompanySchema } from "@/validators/company";
import { createCompanyWithAdmin, type CreateCompanyResult } from "@/features/settings/services/company-management.service";

export type CreateCompanyActionResult =
  | { success: true; result: CreateCompanyResult }
  | { success: false; error: string };

export async function createCompanyAction(input: unknown): Promise<CreateCompanyActionResult> {
  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await createCompanyWithAdmin(parsed.data);
    revalidatePath("/settings");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create company" };
  }
}
