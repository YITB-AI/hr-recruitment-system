import { connectDB } from "@/server/db/connect";
import { userRepository, type CompanyUserRow } from "@/server/repositories/user.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";

export async function listCompanyUsers(): Promise<CompanyUserRow[]> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.manage");
  return userRepository.findAllForCompany(actor.companyId);
}
