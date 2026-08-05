import type { Metadata } from "next";
import { ProfilePageContent, PROFILE_DEEP_LINKABLE_TABS } from "@/features/profile/components/profile-page-content";
import { getOwnProfile } from "@/features/profile/services/profile.service";
import { listOwnCalendarConnections } from "@/features/calendar/services/calendar-connection.service";
import { requireSession } from "@/lib/auth/session";
import { companyRepository } from "@/server/repositories/company.repository";
import { hasCompanyFeature } from "@/lib/auth/feature-access";

export const metadata: Metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const defaultTab = tab && PROFILE_DEEP_LINKABLE_TABS.has(tab) ? tab : "profile";
  const [profile, calendarConnections, actor] = await Promise.all([getOwnProfile(), listOwnCalendarConnections(), requireSession()]);
  const company = await companyRepository.findById(actor.companyId);

  return (
    <ProfilePageContent
      profile={profile}
      calendarConnections={calendarConnections}
      currentSessionId={actor.sessionId}
      defaultTab={defaultTab}
      calendarIntegrationEnabled={Boolean(company && hasCompanyFeature(company, "calendarIntegration"))}
    />
  );
}
