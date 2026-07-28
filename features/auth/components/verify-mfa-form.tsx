"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyMfaAction } from "@/actions/auth";

export function VerifyMfaForm() {
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (useBackupCode) formData.set("useBackupCode", "on");

    startTransition(async () => {
      const result = await verifyMfaAction(formData);
      if (result && !result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">{useBackupCode ? "Backup code" : "6-digit code"}</Label>
        <Input
          id="code"
          name="code"
          type="text"
          inputMode={useBackupCode ? "text" : "numeric"}
          autoComplete="one-time-code"
          autoFocus
          placeholder={useBackupCode ? "XXXX-XXXX-XX" : "123456"}
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Verifying..." : "Verify"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setUseBackupCode((v) => !v);
          setError(null);
        }}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {useBackupCode ? "Use your authenticator app instead" : "Use a backup code instead"}
      </button>
    </form>
  );
}
