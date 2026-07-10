"use client";

import { Users2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NavList } from "@/components/layout/nav-list";
import { useUIStore } from "@/store/ui-store";

export function MobileSidebar() {
  const open = useUIStore((state) => state.mobileSidebarOpen);
  const setOpen = useUIStore((state) => state.setMobileSidebarOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Users2 className="size-5" />
            </div>
            HR Platform
          </SheetTitle>
        </SheetHeader>
        <NavList layoutId="mobile-active-pill" onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
