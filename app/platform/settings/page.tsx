import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PlatformAdminManagementPanel } from "@/features/platform/components/platform-admin-management-panel";
import { listPlatformAdmins } from "@/features/platform/services/platform-admin-management.service";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Platform Settings" };
export const dynamic = "force-dynamic";

// v1: Platform Administrators management -- the one genuinely real,
// previously-missing capability at the platform level (granting/revoking
// isPlatformAdmin currently requires a one-off script run directly
// against the database). Deliberately not a grab-bag of placeholder
// sections (API Keys, Audit Logs, etc.) with no real backing data yet --
// those get added here as their own actual features land, not before.
export default async function PlatformSettingsPage() {
  const [admins, actor] = await Promise.all([listPlatformAdmins(), getCurrentUser()]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Platform Settings" description="Manage who has platform-wide administrator access." />
      <PlatformAdminManagementPanel admins={admins} currentUserId={actor.id} />
    </div>
  );
}
