"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { grantPlatformAdminAction, revokePlatformAdminAction } from "@/actions/platform-admins";
import type { PlatformAdminRow } from "@/features/platform/services/platform-admin-management.service";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function PlatformAdminManagementPanel({ admins, currentUserId }: { admins: PlatformAdminRow[]; currentUserId: string }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleGrant() {
    startTransition(async () => {
      const result = await grantPlatformAdminAction({ email });
      if (result.success) {
        toast.success("Platform admin access granted");
        setIsAddOpen(false);
        setEmail("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRevoke(admin: PlatformAdminRow) {
    if (!confirm(`Revoke platform admin access from ${admin.name}? They'll keep their normal account, just lose access to this workspace.`)) return;
    startTransition(async () => {
      const result = await revokePlatformAdminAction(admin._id);
      if (result.success) toast.success("Platform admin access revoked");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {admins.length} platform admin{admins.length === 1 ? "" : "s"} — every one of them can manage every company on this platform.
        </p>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4" />
          Grant Access
        </Button>
      </div>

      {admins.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No platform admins found" description="This shouldn't happen — grant access to at least one account." />
      ) : (
        <div className="divide-y rounded-xl border">
          {admins.map((admin) => (
            <div key={admin._id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(admin.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{admin.name}</p>
                    {admin._id === currentUserId && <Badge variant="outline" className="text-[10px]">You</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {admin.email}
                    {admin.companyName && <span> · Home company: {admin.companyName}</span>}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRevoke(admin)}
                disabled={isPending || admin._id === currentUserId}
                title={admin._id === currentUserId ? "You can't revoke your own access" : "Revoke platform admin access"}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant platform admin access</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="grant-email">Email address</Label>
              <Input id="grant-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
              <p className="text-xs text-muted-foreground">Must be an existing user — this doesn&apos;t create a new account, only elevates one that already exists.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleGrant} disabled={isPending || !email.trim()}>
              {isPending ? "Granting..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
