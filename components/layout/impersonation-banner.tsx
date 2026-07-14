"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endImpersonationAction } from "@/actions/impersonation";

export function ImpersonationBanner({ viewingAsName, adminName }: { viewingAsName: string; adminName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleReturn() {
    startTransition(async () => {
      const result = await endImpersonationAction();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // Hard navigation, not router.push/refresh — see the comment on
      // actions/impersonation.ts for why a same-path client transition
      // isn't reliable enough for a session swap.
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <UserCog className="size-4" />
      <span>
        {adminName} is viewing as <strong>{viewingAsName}</strong>
      </span>
      <Button size="sm" variant="outline" className="h-7 border-amber-950/30 bg-amber-50 hover:bg-amber-100" onClick={handleReturn} disabled={isPending}>
        {isPending ? "Returning..." : "Return to my account"}
      </Button>
    </div>
  );
}
