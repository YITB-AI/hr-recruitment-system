import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { GeneralSettingsForm } from "@/features/settings/components/general-settings-form";
import { NotificationSettingsForm } from "@/features/settings/components/notification-settings-form";
import { AppearanceSettingsForm } from "@/features/settings/components/appearance-settings-form";
import { UsersTable } from "@/features/settings/components/users-table";
import { UnmappedJobsTable } from "@/features/settings/components/unmapped-jobs-table";
import { getSettings } from "@/features/settings/services/settings.service";
import { listCompanyUsers } from "@/features/settings/services/user-management.service";
import { listUnmappedJobs, listCompaniesForMapping } from "@/features/settings/services/job-mapping.service";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const actor = await getCurrentUser();
  const isAdmin = actor.role === "admin";

  const [settings, users, unmappedJobs, companies] = await Promise.all([
    getSettings(),
    isAdmin ? listCompanyUsers() : Promise.resolve(null),
    isAdmin ? listUnmappedJobs() : Promise.resolve(null),
    isAdmin ? listCompaniesForMapping() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Settings" description="Manage your organization's configuration and appearance." />

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              {isAdmin && <TabsTrigger value="users">Users & Roles</TabsTrigger>}
              {isAdmin && <TabsTrigger value="unmapped-jobs">Unmapped Jobs</TabsTrigger>}
            </TabsList>

            <TabsContent value="general" className="pt-6">
              <GeneralSettingsForm settings={settings} />
            </TabsContent>

            <TabsContent value="appearance" className="pt-6">
              <AppearanceSettingsForm settings={settings} />
            </TabsContent>

            <TabsContent value="notifications" className="pt-6">
              <NotificationSettingsForm settings={settings} />
            </TabsContent>

            {isAdmin && users && (
              <TabsContent value="users" className="pt-6">
                <UsersTable users={users} />
              </TabsContent>
            )}

            {isAdmin && unmappedJobs && companies && (
              <TabsContent value="unmapped-jobs" className="pt-6">
                <UnmappedJobsTable jobs={unmappedJobs} companies={companies} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
