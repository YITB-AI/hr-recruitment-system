import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { ConfirmDialogHost } from "@/components/shared/confirm-dialog-host";
import { AuthTabSync } from "@/components/layout/auth-tab-sync";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { NotificationBellData } from "@/components/layout/notification-bell-data";
import { NotificationBellSkeleton } from "@/components/layout/notification-bell-skeleton";
import { getCurrentUser } from "@/lib/current-user";

// The notification queries used to be awaited here, blocking the entire
// shell (sidebar/topbar frame) behind them on every navigation. They're now
// fetched inside NotificationBellData, wrapped in <Suspense> below, so the
// shell itself only ever waits on the already-cache()-deduped session
// lookup — the notification bell streams in independently a moment later
// instead of holding up everything else.
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Authoritative enforcement of the same two onboarding checks
  // actions/auth.ts's loginAction applies right after login — this is the
  // one shared layout for every route under the (app) group (including
  // /dashboard), so a session with either flag still pending can never
  // reach a real page just by navigating straight to its URL instead of
  // following the login redirect. /change-password and /mfa-setup live
  // under the separate (auth) route group, so this can't loop against them.
  if (user.mustChangePassword) redirect("/change-password");
  if (user.mfaSetupRequired) redirect("/mfa-setup");

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {user.impersonatedBy && (
        <ImpersonationBanner viewingAsName={user.name} adminName={user.impersonatedBy.name} />
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/30">
        <AuthTabSync />
        <Sidebar />
        <MobileSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={user}
            notificationSlot={
              <Suspense fallback={<NotificationBellSkeleton />}>
                <NotificationBellData userId={user.id} />
              </Suspense>
            }
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <CommandPalette />
        <ConfirmDialogHost />
      </div>
    </div>
  );
}
