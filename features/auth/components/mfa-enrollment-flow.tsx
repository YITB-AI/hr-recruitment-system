"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startMfaEnrollmentAction, confirmMfaEnrollmentAction } from "@/actions/mfa";

type Step = "start" | "scan" | "backup-codes";

// Shared between the Profile > Security "enable MFA" card and the forced
// /mfa-setup page for admins without it yet — one enrollment flow, two
// entry points, so they can never silently drift apart.
export function MfaEnrollmentFlow({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<Step>("start");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startMfaEnrollmentAction();
      if (result.success) {
        setQrCodeDataUrl(result.qrCodeDataUrl);
        setSecret(result.secret);
        setStep("scan");
      } else {
        setError(result.error);
      }
    });
  }

  function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await confirmMfaEnrollmentAction(formData);
      if (result.success) {
        setBackupCodes(result.backupCodes);
        setStep("backup-codes");
      } else {
        setError(result.error);
      }
    });
  }

  if (step === "start") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Protect your account with a second verification step using an authenticator app (Google Authenticator, Authy, 1Password,
          etc.).
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleStart} disabled={isPending} className="w-full">
          {isPending ? "Starting..." : "Set up two-factor authentication"}
        </Button>
      </div>
    );
  }

  if (step === "scan") {
    return (
      <form onSubmit={handleConfirm} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
        </p>
        {qrCodeDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrCodeDataUrl} alt="Scan with your authenticator app" className="mx-auto size-48 rounded-lg border" />
        )}
        {secret && (
          <p className="text-center text-xs text-muted-foreground">
            Can&apos;t scan? Enter this code manually: <span className="font-mono">{secret}</span>
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="mfa-confirm-code">6-digit code</Label>
          <Input id="mfa-confirm-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Confirming..." : "Confirm and enable"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Save these backup codes somewhere safe. Each one can be used once to sign in if you lose access to your authenticator app —
        they won&apos;t be shown again.
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
        {backupCodes.map((code) => (
          <div key={code}>{code}</div>
        ))}
      </div>
      <Button className="w-full" onClick={() => onComplete?.()}>
        Done
      </Button>
    </div>
  );
}
