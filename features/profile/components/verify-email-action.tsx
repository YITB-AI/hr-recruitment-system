"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestOwnEmailVerificationAction, confirmOwnEmailVerificationAction } from "@/actions/profile";

export function VerifyEmailAction() {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "verify">("idle");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await requestOwnEmailVerificationAction();
      if (result.success) {
        setMode("verify");
        toast.success("Verification code sent to your email");
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
      const result = await confirmOwnEmailVerificationAction({ code });
      if (result.success) {
        toast.success("Email verified");
        setMode("idle");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (mode === "idle") {
    return (
      <Button type="button" size="sm" variant="outline" onClick={handleSend} disabled={isPending}>
        {isPending ? "Sending..." : "Verify Email"}
      </Button>
    );
  }

  return (
    <form onSubmit={handleVerifySubmit} className="flex items-center gap-2">
      <Input
        name="code"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        placeholder="6-digit code"
        required
        autoFocus
        className="h-8 w-32"
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Verifying..." : "Verify"}
      </Button>
      <button
        type="button"
        onClick={handleSend}
        disabled={isPending}
        className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
      >
        Resend
      </button>
    </form>
  );
}
