import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileSummaryCard } from "@/features/profile/components/profile-summary-card";
import { EditProfileForm } from "@/features/profile/components/edit-profile-form";
import { ChangePasswordCard } from "@/features/profile/components/change-password-card";
import { ChangeEmailCard } from "@/features/profile/components/change-email-card";
import { getOwnProfile } from "@/features/profile/services/profile.service";

export const metadata: Metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getOwnProfile();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="My Profile" description="View and manage your account details and security settings." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="profile">
                <TabsList>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="pt-6">
                  <EditProfileForm profile={profile} />
                </TabsContent>

                <TabsContent value="security" className="space-y-8 pt-6">
                  <div>
                    <h3 className="mb-4 text-sm font-medium">Password</h3>
                    <ChangePasswordCard />
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="mb-4 text-sm font-medium">Email Address</h3>
                    <ChangeEmailCard profile={profile} />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ProfileSummaryCard profile={profile} />
        </div>
      </div>
    </div>
  );
}
