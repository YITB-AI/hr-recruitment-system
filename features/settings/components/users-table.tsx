"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, MoreVertical, Pencil, Plus, Trash2, Users as UsersIcon, UserCog } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { createUserAction, updateUserAction, deleteUserAction } from "@/actions/users";
import { startImpersonationAction } from "@/actions/impersonation";
import { USER_ROLES, USER_ROLE_LABELS, type UserRole } from "@/constants/user";
import type { CompanyUserRow } from "@/server/repositories/user.repository";

const ROLE_ITEMS = USER_ROLES.map((role) => ({ value: role, label: USER_ROLE_LABELS[role] }));

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function UsersTable({ users }: { users: CompanyUserRow[] }) {
  const [resetTarget, setResetTarget] = useState<CompanyUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("recruiter");
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  const [editTarget, setEditTarget] = useState<CompanyUserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("recruiter");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isRowActionPending, startRowAction] = useTransition();

  async function handleReset() {
    if (!resetTarget) return;
    setIsResetting(true);
    const result = await adminResetPasswordAction({ userId: resetTarget._id, newPassword });
    setIsResetting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Password reset for ${resetTarget.name}. They'll be asked to set a new one at their next login.`);
    setResetTarget(null);
    setNewPassword("");
  }

  async function handleCreate() {
    setIsCreating(true);
    const result = await createUserAction({ name: newName, email: newEmail, role: newRole });
    setIsCreating(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setCreatedCredentials({ email: result.result.user.email, tempPassword: result.result.tempPassword });
    setNewName("");
    setNewEmail("");
    setNewRole("recruiter");
  }

  function openEdit(user: CompanyUserRow) {
    setEditTarget(user);
    setEditName(user.name);
    setEditRole(user.role);
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setIsSavingEdit(true);
    const result = await updateUserAction({ userId: editTarget._id, name: editName, role: editRole });
    setIsSavingEdit(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("User updated");
    setEditTarget(null);
  }

  function handleDelete(user: CompanyUserRow) {
    if (!confirm(`Remove ${user.name} from the team? This can't be undone.`)) return;
    startRowAction(async () => {
      const result = await deleteUserAction(user._id);
      if (!result.success) toast.error(result.error);
      else toast.success("User removed");
    });
  }

  function handleImpersonate(user: CompanyUserRow) {
    if (!confirm(`View the app as ${user.name}? You can return to your own account at any time.`)) return;
    startRowAction(async () => {
      const result = await startImpersonationAction(user._id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // Hard navigation — see the comment on actions/impersonation.ts for why.
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users.length} user{users.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4" />
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" description="No users exist for this company yet." />
      ) : (
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
                  <Badge variant="outline">{USER_ROLE_LABELS[user.role]}</Badge>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isRowActionPending} />}>
                      <MoreVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(user)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setResetTarget(user)}>
                        <KeyRound className="size-4" />
                        Reset Password
                      </DropdownMenuItem>
                      {user.role !== "admin" && (
                        <DropdownMenuItem onClick={() => handleImpersonate(user)}>
                          <UserCog className="size-4" />
                          Impersonate User
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(user)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add User */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setCreatedCredentials(null);
        }}
      >
        <DialogContent>
          {!createdCredentials ? (
            <>
              <DialogHeader>
                <DialogTitle>Add a user</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="newUserName">Name</Label>
                  <Input id="newUserName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newUserEmail">Email</Label>
                  <Input
                    id="newUserEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="jane@company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select items={ROLE_ITEMS} value={newRole} onValueChange={(v) => setNewRole((v as UserRole) ?? "recruiter")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {USER_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate} disabled={isCreating || !newName || !newEmail}>
                  {isCreating ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>User created</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Email:</span> {createdCredentials.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Temporary password:</span>{" "}
                  <code>{createdCredentials.tempPassword}</code>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this securely. They&apos;ll be required to set their own password on first login.
              </p>
              <DialogFooter>
                <DialogClose render={<Button />}>Done</DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editUserName">Name</Label>
              <Input id="editUserName" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select items={ROLE_ITEMS} value={editRole} onValueChange={(v) => setEditRole((v as UserRole) ?? "recruiter")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {USER_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editName}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
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
            <Button onClick={handleReset} disabled={isResetting || newPassword.length < 8}>
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
