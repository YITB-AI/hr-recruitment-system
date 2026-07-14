"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestEmailChangeAction,
  resendEmailChangeCodeAction,
  confirmEmailChangeAction,
} from "@/actions/profile";
import type { OwnProfile } from "@/features/profile/services/profile.service";

type Mode = "view" | "request" | "verify";

export function ChangeEmailCard({ profile }: { profile: OwnProfile }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(profile.pendingEmail ? "verify" : "view");
  const [pendingEmail, setPendingEmail] = useState(profile.pendingEmail ?? "");
  const [isPending, startTransition] = useTransition();

  function handleRequestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newEmail = String(formData.get("newEmail") ?? "");
    const currentPassword = String(formData.get("currentPassword") ?? "");

    startTransition(async () => {
      const result = await requestEmailChangeAction({ newEmail, currentPassword });
      if (result.success) {
        setPendingEmail(newEmail.toLowerCase().trim());
        setMode("verify");
        toast.success("Verification code sent to your new email");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleVerifySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code") ?? "");

    startTransition(async () => {
      const result = await confirmEmailChangeAction({ code });
      if (result.success) {
        setMode("view");
        toast.success(`Email updated to ${result.newEmail}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleResend() {
    startTransition(async () => {
      const result = await resendEmailChangeCodeAction();
      if (result.success) toast.success("A new code has been sent");
      else toast.error(result.error);
    });
  }

  if (mode === "view") {
    return (
      <div className="max-w-lg space-y-3">
        <p className="text-sm text-muted-foreground">
          Current email: <span className="font-medium text-foreground">{profile.email}</span>
        </p>
        <Button type="button" variant="outline" onClick={() => setMode("request")}>
          Change Email
        </Button>
      </div>
    );
  }

  if (mode === "request") {
    return (
      <form onSubmit={handleRequestSubmit} className="max-w-lg space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="newEmail">New Email</Label>
          <Input id="newEmail" name="newEmail" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          <p className="text-xs text-muted-foreground">We need this to confirm it&apos;s really you.</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Sending..." : "Send Verification Code"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMode("view")} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifySubmit} className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to <span className="font-medium text-foreground">{pendingEmail}</span>. It expires in 15
        minutes.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="code">Verification Code</Label>
        <Input id="code" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoFocus />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Verifying..." : "Verify & Update Email"}
        </Button>
        <button
          type="button"
          onClick={handleResend}
          disabled={isPending}
          className="text-sm text-primary underline-offset-2 hover:underline disabled:opacity-50"
        >
          Resend code
        </button>
      </div>
    </form>
  );
}
