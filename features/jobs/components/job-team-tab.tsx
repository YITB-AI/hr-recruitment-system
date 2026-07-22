"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Users, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { updateJobTeamAction } from "@/actions/jobs";
import type { UserRow, TeamMemberRow } from "@/server/repositories/user.repository";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function JobTeamTab({
  jobId,
  teamMembers,
  companyUsers,
}: {
  jobId: string;
  teamMembers: TeamMemberRow[];
  companyUsers: UserRow[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(teamMembers.map((m) => m._id));
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setSelectedIds(teamMembers.map((m) => m._id));
    setOpen(true);
  }

  function save(nextIds: string[]) {
    startTransition(async () => {
      const result = await updateJobTeamAction({ jobId, memberIds: nextIds });
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Team updated");
        setOpen(false);
      }
    });
  }

  function handleRemove(memberId: string) {
    save(teamMembers.map((m) => m._id).filter((id) => id !== memberId));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Hiring Team</h3>
        <Button variant="outline" size="sm" onClick={openDialog}>
          <UserPlus className="size-4" />
          Manage Team
        </Button>
      </div>

      {teamMembers.length === 0 ? (
        <EmptyState icon={Users} title="No team members assigned" description="Assign the staff responsible for this job." />
      ) : (
        <ul className="divide-y rounded-xl border">
          {teamMembers.map((member) => (
            <li key={member._id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <Badge variant="outline" className="mt-0.5 capitalize">
                    {member.role}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleRemove(member._id)}>
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Hiring Team</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border p-3">
            {companyUsers.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
            {companyUsers.map((user) => {
              const checked = selectedIds.includes(user._id);
              return (
                <label key={user._id} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      setSelectedIds((prev) => (value ? [...prev, user._id] : prev.filter((id) => id !== user._id)))
                    }
                  />
                  {user.name}
                  {user.title && <span className="text-xs text-muted-foreground">({user.title})</span>}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
            <Button disabled={isPending} onClick={() => save(selectedIds)}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
