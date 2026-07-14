"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/actions/notifications";

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.success) toast.error(result.error);
      else toast.success("All notifications marked as read");
    });
  }

  return (
    <Button type="button" variant="outline" disabled={disabled || isPending} onClick={handleClick}>
      <CheckCheck className="size-4" />
      Mark all as read
    </Button>
  );
}
