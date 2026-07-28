"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { MfaEnrollmentFlow } from "@/features/auth/components/mfa-enrollment-flow";
import { disableMfaAction } from "@/actions/mfa";

export function MfaSettingsCard({ mfaEnabled, role }: { mfaEnabled: boolean; role: string }) {
  const [enrolling, setEnrolling] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDisable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await disableMfaAction(formData);
      if (result.success) {
        toast.success("Two-factor authentication disabled");
        setDisableOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (mfaEnabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span className="font-medium">Two-factor authentication is enabled</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>
          <ShieldOff className="size-4" />
          Disable
        </Button>

        <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDisable} className="space-y-4 py-2">
              {role === "admin" && (
                <p className="text-sm text-muted-foreground">
                  As an admin, you&apos;ll be asked to set it back up the next time you log in.
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="disable-mfa-password">Confirm your password</Label>
                <Input id="disable-mfa-password" name="currentPassword" type="password" autoComplete="current-password" required />
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
                <Button type="submit" variant="destructive" disabled={isPending}>
                  {isPending ? "Disabling..." : "Disable"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (enrolling) {
    return <MfaEnrollmentFlow onComplete={() => setEnrolling(false)} />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Two-factor authentication is not enabled{role === "admin" ? " — required for your admin role" : ""}.
      </p>
      <Button size="sm" onClick={() => setEnrolling(true)}>
        <ShieldCheck className="size-4" />
        Enable two-factor authentication
      </Button>
    </div>
  );
}
