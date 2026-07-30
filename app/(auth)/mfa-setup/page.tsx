import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { MfaSetupFlow } from "@/features/auth/components/mfa-setup-flow";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set Up Two-Factor Authentication" };
export const dynamic = "force-dynamic";

// Mirrors app/(auth)/change-password/page.tsx exactly: a real session
// already exists (requireSession succeeds), this is a one-time forced
// redirect target set right after login, not a persistent middleware-level
// block on every subsequent page load — see actions/auth.ts's loginAction
// and app/(app)/layout.tsx (which enforces the same two checks on every
// other page). mustChangePassword is checked first, matching that same
// ordering everywhere else this pair of checks appears.
export default async function MfaSetupPage() {
  const user = await requireSession();
  if (user.mustChangePassword) redirect("/change-password");
  if (!user.mfaSetupRequired) redirect("/dashboard");

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Set up two-factor authentication</h1>
          <p className="text-sm text-muted-foreground">
            Hi {user.name.split(" ")[0]} — as an admin, you need to set up two-factor authentication before continuing.
          </p>
        </div>
      </div>
      <MfaSetupFlow />
    </div>
  );
}
