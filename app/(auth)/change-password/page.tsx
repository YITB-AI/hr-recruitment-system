import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Change Password" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireSession();

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Hi {user.name.split(" ")[0]} — you&apos;re using a temporary password. Set your own before continuing.
          </p>
        </div>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
