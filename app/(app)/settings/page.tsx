import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { GeneralSettingsForm } from "@/features/settings/components/general-settings-form";
import { NotificationSettingsForm } from "@/features/settings/components/notification-settings-form";
import { AppearanceSettingsForm } from "@/features/settings/components/appearance-settings-form";
import { getSettings } from "@/features/settings/services/settings.service";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
