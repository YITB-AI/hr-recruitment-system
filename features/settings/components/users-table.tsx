"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Users as UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { adminResetPasswordAction } from "@/actions/auth";
import type { CompanyUserRow } from "@/server/repositories/user.repository";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function UsersTable({ users }: { users: CompanyUserRow[] }) {
  const [resetTarget, setResetTarget] = useState<CompanyUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (users.length === 0) {
    return <EmptyState icon={UsersIcon} title="No users found" description="No users exist for this company yet." />;
  }

  async function handleReset() {
    if (!resetTarget) return;
    setIsSubmitting(true);
    const result = await adminResetPasswordAction({ userId: resetTarget._id, newPassword });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Password reset for ${resetTarget.name}. They'll be asked to set a new one at their next login.`);
    setResetTarget(null);
    setNewPassword("");
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-foreground/80">{user.email}</td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize">
                  {user.role}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {user.mustChangePassword ? (
                  <Badge variant="outline" className="text-amber-600">
                    Must change password
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Active</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="outline" size="sm" onClick={() => setResetTarget(user)}>
                  <KeyRound className="size-4" />
                  Reset Password
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={resetTarget !== null} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {resetTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <p className="text-xs text-muted-foreground">
              Share this with {resetTarget?.name} securely. They&apos;ll be required to set their own password at
              their next login, and any devices they&apos;re currently logged in on will be signed out.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleReset} disabled={isSubmitting || newPassword.length < 8}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
