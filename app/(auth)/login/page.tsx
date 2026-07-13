import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";
import { getTenantSlugFromRequest } from "@/lib/auth/session";
import { companyRepository } from "@/server/repositories/company.repository";
import { connectDB } from "@/server/db/connect";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const tenantSlug = await getTenantSlugFromRequest();
  let companyName: string | null = null;
  if (tenantSlug) {
    await connectDB();
    const company = await companyRepository.findBySlug(tenantSlug);
    companyName = company?.name ?? null;
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            {companyName ? (
              <>
                Sign in to <span className="font-medium text-foreground">{companyName}</span>
              </>
            ) : (
              "Sign in to your account"
            )}
          </p>
        </div>
      </div>
      <LoginForm />
    </div>
  );
}
