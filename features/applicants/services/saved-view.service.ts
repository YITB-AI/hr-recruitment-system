import { connectDB } from "@/server/db/connect";
import { savedViewRepository } from "@/server/repositories/saved-view.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";

export async function listSavedViews() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return savedViewRepository.findAll(companyId);
}

export async function createSavedView(name: string, filters: Record<string, string>) {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "saved_view.manage");
  return savedViewRepository.create(actor.companyId, {
    name,
    filters,
    createdByName: actor.id === "system" ? undefined : actor.name,
  });
}

export async function deleteSavedView(id: string) {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "saved_view.manage");
  return savedViewRepository.delete(actor.companyId, id);
}
