"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreVertical, Eye, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveJobAction, restoreJobAction, deleteJobAction } from "@/actions/jobs";

export function JobRowActions({ jobId, title, isArchived }: { jobId: string; title: string; isArchived: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveJobAction(jobId);
      if (!result.success) toast.error(result.error);
      else toast.success(`"${title}" archived`);
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreJobAction(jobId);
      if (!result.success) toast.error(result.error);
      else toast.success(`"${title}" restored`);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteJobAction(jobId);
      if (!result.success) toast.error(result.error);
      else toast.success("Job deleted");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isPending} />}>
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/jobs/${jobId}`} />}>
          <Eye className="size-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={`/jobs/${jobId}/edit`} />}>
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isArchived ? (
          <DropdownMenuItem onClick={handleRestore}>
            <ArchiveRestore className="size-4" />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="size-4" />
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
