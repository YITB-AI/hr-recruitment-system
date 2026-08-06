"use client";

import { Search } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { ProfileMenu } from "@/components/layout/profile-menu";
import type { SessionUser } from "@/types/user";

export function PlatformTopbar({ user }: { user: SessionUser }) {
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-1 max-w-md items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="hidden rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <p className="hidden text-sm font-medium text-muted-foreground sm:block">Global Super Admin</p>
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <ProfileMenu user={user} basePath="/platform" />
      </div>
    </header>
  );
}
