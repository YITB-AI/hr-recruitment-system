import { ProfileMenu } from "@/components/layout/profile-menu";
import type { SessionUser } from "@/types/user";

export function PlatformTopbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <p className="text-sm font-medium text-muted-foreground">Global Super Admin</p>
      <ProfileMenu user={user} />
    </header>
  );
}
