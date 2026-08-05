import { User, ShieldCheck, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileSummaryCard } from "@/features/profile/components/profile-summary-card";
import { EditProfileForm } from "@/features/profile/components/edit-profile-form";
import { ChangePasswordCard } from "@/features/profile/components/change-password-card";
import { ChangeEmailCard } from "@/features/profile/components/change-email-card";
import { MfaSettingsCard } from "@/features/profile/components/mfa-settings-card";
import { ActiveSessionsCard } from "@/features/profile/components/active-sessions-card";
import { CalendarConnectionsCard } from "@/features/profile/components/calendar-connections-card";
import type { OwnProfile } from "@/features/profile/services/profile.service";
import type { CalendarConnectionRow } from "@/server/repositories/calendar-connection.repository";

export const PROFILE_DEEP_LINKABLE_TABS = new Set(["profile", "security", "calendar"]);

// A user's own account info (name, email, password, MFA, sessions) is
// identical in shape whether the viewer is a platform admin or a tenant
// user — this is the one thing shared between app/(app)/profile/page.tsx
// and app/platform/profile/page.tsx, so the two routes just differ in
// which shell wraps this, not in what it renders.
export function ProfilePageContent({
  profile,
  calendarConnections,
  currentSessionId,
  defaultTab,
  calendarIntegrationEnabled,
}: {
  profile: OwnProfile;
  calendarConnections: CalendarConnectionRow[];
  currentSessionId: string | null;
  defaultTab: string;
  calendarIntegrationEnabled: boolean;
}) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="My Profile" description="Manage your personal information and account preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <Tabs defaultValue={defaultTab} orientation="vertical" className="items-start">
          <TabsList variant="line" className="h-fit w-52 shrink-0 flex-col items-stretch gap-1 bg-transparent p-0">
            <TabsTrigger
              value="profile"
              className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none"
            >
              <User className="size-4" />
              Profile Information
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none"
            >
              <ShieldCheck className="size-4" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="w-full justify-start gap-2 rounded-lg px-3 py-2 data-active:bg-muted data-active:shadow-none"
            >
              <CalendarDays className="size-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <Card className="flex-1">
            <CardContent className="pt-6">
              <TabsContent value="profile">
                <EditProfileForm profile={profile} />
              </TabsContent>

              <TabsContent value="security" className="space-y-8">
                <div>
                  <h3 className="mb-4 text-sm font-medium">Password</h3>
                  <ChangePasswordCard />
                </div>
                <div className="border-t pt-6">
                  <h3 className="mb-4 text-sm font-medium">Email Address</h3>
                  <ChangeEmailCard profile={profile} />
                </div>
                <div className="border-t pt-6">
                  <h3 className="mb-4 text-sm font-medium">Two-Factor Authentication</h3>
                  <MfaSettingsCard mfaEnabled={profile.mfaEnabled} role={profile.role} />
                </div>
                <div className="border-t pt-6">
                  <h3 className="mb-4 text-sm font-medium">Active Sessions</h3>
                  <ActiveSessionsCard currentSessionId={currentSessionId} />
                </div>
              </TabsContent>

              <TabsContent value="calendar">
                <CalendarConnectionsCard connections={calendarConnections} calendarIntegrationEnabled={calendarIntegrationEnabled} />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        <div className="space-y-6">
          <ProfileSummaryCard profile={profile} />
        </div>
      </div>
    </div>
  );
}
