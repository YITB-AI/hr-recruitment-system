import type { Metadata } from "next";
import { User, ShieldCheck } from "lucide-react";
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
      <PageHeader title="My Profile" description="Manage your personal information and account preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <Tabs defaultValue="profile" orientation="vertical" className="items-start">
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
