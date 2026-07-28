import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { VerifyMfaForm } from "@/features/auth/components/verify-mfa-form";
import { MFA_PENDING_COOKIE_NAME } from "@/lib/auth/mfa-pending-token";

export const metadata: Metadata = { title: "Verify Identity" };
export const dynamic = "force-dynamic";

// No requireSession() here — by design, there's no real session yet at
// this point (that's the whole point of the pending-MFA flow, see
// lib/auth/mfa-pending-token.ts). Only presence of the pending cookie is
// checked here; the actual verification happens server-side when the form
// submits (verifyMfaAction), including on an expired/tampered token.
export default async function VerifyMfaPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get(MFA_PENDING_COOKIE_NAME)?.value) redirect("/login");

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Two-factor verification</h1>
          <p className="text-sm text-muted-foreground">Enter the code from your authenticator app to continue.</p>
        </div>
      </div>
      <VerifyMfaForm />
    </div>
  );
}
