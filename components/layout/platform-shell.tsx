import { redirect, notFound } from "next/navigation";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { PlatformTopbar } from "@/components/layout/platform-topbar";
import { PlatformCommandPalette } from "@/components/layout/platform-command-palette";
import { getCurrentUser } from "@/lib/current-user";

// The one shared layout for every app/platform/* route. isPlatformAdmin is
// a boolean, session-carried flag (see models/User.ts) — distinct from and
// orthogonal to the per-company `role` field, so a company's own "admin"
// can never reach this workspace just by having the highest role in their
// tenant. Uses notFound(), not a redirect/403 — a non-platform-admin should
// never learn this workspace exists at all, matching the same
// fail-closed-and-silent convention as the cross-tenant file-serving route.
export async function PlatformShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user.isPlatformAdmin) notFound();

  // Same two onboarding checks app/(app)/layout.tsx enforces for every
  // tenant page — a platform admin is still a real User row with these
  // same pending-onboarding flags, and /platform/* isn't under the (app)
  // route group, so without this a platform admin could reach the global
  // workspace straight after login (see actions/auth.ts's loginAction,
  // which now sends platform admins here) while still skipping a forced
  // password change or first-time MFA enrollment.
  if (user.mustChangePassword) redirect("/change-password");
  if (user.mfaSetupRequired) redirect("/mfa-setup");

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <PlatformSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PlatformTopbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <PlatformCommandPalette />
    </div>
  );
}
