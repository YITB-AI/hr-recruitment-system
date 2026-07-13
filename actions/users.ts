"use server";

import { revalidatePath } from "next/cache";
import { createUserSchema, updateUserSchema } from "@/validators/user-management";
import {
  createCompanyUser,
  updateCompanyUser,
  deleteCompanyUser,
  type CreateCompanyUserResult,
} from "@/features/settings/services/user-management.service";
import type { CompanyUserRow } from "@/server/repositories/user.repository";

export type CreateUserActionResult =
  | { success: true; result: CreateCompanyUserResult }
  | { success: false; error: string };

export async function createUserAction(input: unknown): Promise<CreateUserActionResult> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await createCompanyUser(parsed.data);
    revalidatePath("/settings");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create user" };
  }
}

export type UpdateUserActionResult = { success: true; user: CompanyUserRow } | { success: false; error: string };

export async function updateUserAction(input: unknown): Promise<UpdateUserActionResult> {
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const user = await updateCompanyUser(parsed.data);
    revalidatePath("/settings");
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update user" };
  }
}

export type DeleteUserActionResult = { success: true } | { success: false; error: string };

export async function deleteUserAction(userId: string): Promise<DeleteUserActionResult> {
  try {
    await deleteCompanyUser(userId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete user" };
  }
}
