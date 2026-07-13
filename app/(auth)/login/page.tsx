import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your company&apos;s workspace.</p>
        </div>
      </div>
      <LoginForm />
    </div>
  );
}
