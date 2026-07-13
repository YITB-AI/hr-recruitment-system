"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateDocumentStatusAction } from "@/actions/documents";
import type { GeneratedDocumentStatus } from "@/server/repositories/generated-document.repository";

const NEXT_STATUS: Record<string, GeneratedDocumentStatus | undefined> = {
  generated: "sent",
  sent: "signed",
  signed: undefined,
};

const STATUS_LABEL: Record<string, string> = {
  generated: "Generated",
  sent: "Sent",
  signed: "Signed",
};

export function DocumentStatusMenu({ documentId, status }: { documentId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const nextStatus = NEXT_STATUS[status];

  function markAs(next: GeneratedDocumentStatus) {
    startTransition(async () => {
      const result = await updateDocumentStatusAction(documentId, next);
      if (!result.success) toast.error(result.error);
      else toast.success(`Marked as ${STATUS_LABEL[next]}`);
    });
  }

  if (!nextStatus) {
    return (
      <Badge variant="outline" className="capitalize">
        {status}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge variant="outline" className="capitalize">
        {status}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isPending} />}>
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => markAs(nextStatus)}>Mark as {STATUS_LABEL[nextStatus]}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
