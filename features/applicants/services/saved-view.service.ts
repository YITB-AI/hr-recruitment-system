import { connectDB } from "@/server/db/connect";
import { savedViewRepository } from "@/server/repositories/saved-view.repository";
import { getCurrentUser } from "@/lib/current-user";

export async function listSavedViews() {
  await connectDB();
  return savedViewRepository.findAll();
}

export async function createSavedView(name: string, filters: Record<string, string>) {
  await connectDB();
  const actor = await getCurrentUser();
  return savedViewRepository.create({
    name,
    filters,
    createdByName: actor.id === "no-users-seeded" ? undefined : actor.name,
  });
}

export async function deleteSavedView(id: string) {
  await connectDB();
  return savedViewRepository.delete(id);
}
