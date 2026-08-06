"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { PLATFORM_NAV_GROUPS } from "@/components/layout/platform-sidebar";
import { useUIStore } from "@/store/ui-store";

// The Global Super Admin workspace's own search — sourced from the same
// PLATFORM_NAV_GROUPS the sidebar renders, so this never lists a
// destination the sidebar doesn't also have. Deliberately not reusing
// command-palette.tsx: that one is hardcoded to the tenant's NAV_ITEMS/
// job-and-applicant quick actions, none of which apply here.
export function PlatformCommandPalette() {
  const router = useRouter();
  const open = useUIStore((state) => state.commandPaletteOpen);
  const setOpen = useUIStore((state) => state.setCommandPaletteOpen);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search anything..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {PLATFORM_NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`}>
            {groupIndex > 0 && <CommandSeparator />}
            <CommandGroup heading={group.label ?? "Navigate"}>
              {group.items.map((item) => (
                <CommandItem key={item.href} onSelect={() => go(item.href)}>
                  <item.icon className="opacity-60" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
