"use client";

import { useRouter } from "next/navigation";
import { MfaEnrollmentFlow } from "@/features/auth/components/mfa-enrollment-flow";

// next/navigation's redirect() only works in Server Components/Actions —
// it can't be passed down as a prop function to a Client Component, and
// MfaEnrollmentFlow is one. This thin client wrapper uses the router
// instead, so app/(auth)/mfa-setup/page.tsx (a Server Component) never
// needs to hand a server-only function across that boundary.
export function MfaSetupFlow({ homeRoute }: { homeRoute: string }) {
  const router = useRouter();
  return <MfaEnrollmentFlow onComplete={() => router.push(homeRoute)} />;
}
