import { notFound } from "next/navigation";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { getCurrentUser } from "@/lib/current-user";

// The one shared layout for every app/(platform)/* route. isPlatformAdmin is
// a boolean, session-carried flag (see models/User.ts) — distinct from and
// orthogonal to the per-company `role` field, so a company's own "admin"
// can never reach this workspace just by having the highest role in their
// tenant. Uses notFound(), not a redirect/403 — a non-platform-admin should
// never learn this workspace exists at all, matching the same
// fail-closed-and-silent convention as the cross-tenant file-serving route.
export async function PlatformShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user.isPlatformAdmin) notFound();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <PlatformSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PlatformTopbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
