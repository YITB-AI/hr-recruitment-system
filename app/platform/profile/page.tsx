import type { Metadata } from "next";
import { ProfilePageContent, PROFILE_DEEP_LINKABLE_TABS } from "@/features/profile/components/profile-page-content";
import { getOwnProfile } from "@/features/profile/services/profile.service";
import { listOwnCalendarConnections } from "@/features/calendar/services/calendar-connection.service";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

// A platform admin's own profile — same data, same shared components as
// the tenant app/(app)/profile/page.tsx (see ProfilePageContent's own
// comment for why), just reached from and wrapped in the Platform
// workspace instead of a company's tenant shell. This is what
// ProfileMenu's "Profile" item links to when rendered inside
// PlatformTopbar — before this route existed, that link took a platform
// admin out of /platform/* entirely and into the tenant shell.
export default async function PlatformProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const defaultTab = tab && PROFILE_DEEP_LINKABLE_TABS.has(tab) ? tab : "profile";
  const [profile, calendarConnections, actor] = await Promise.all([getOwnProfile(), listOwnCalendarConnections(), requireSession()]);

  return (
    <ProfilePageContent profile={profile} calendarConnections={calendarConnections} currentSessionId={actor.sessionId} defaultTab={defaultTab} />
  );
}
