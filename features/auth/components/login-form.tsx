"use client";

import { useState, useTransition } from "react";
import Script from "next/script";
import { Building2, Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/actions/auth";

// Public by design (must be readable client-side to render the widget) —
// inlined at build time by Next.js's NEXT_PUBLIC_ convention, same as
// every other NEXT_PUBLIC_ var in this codebase. Unset until the owner
// provisions a real Cloudflare Turnstile site — the widget simply doesn't
// render in that case (matches lib/turnstile.ts's server-side skip when
// TURNSTILE_SECRET_KEY isn't configured either, so login stays fully
// functional either way).
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result && !result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="companySlug">Company ID</Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="companySlug"
            name="companySlug"
            type="text"
            autoComplete="organization"
            placeholder="e.g. digital-auxilius — leave blank if you're a platform admin"
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" name="email" type="email" autoComplete="email" required className="pl-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="rememberMe" className="size-4 accent-primary" />
        Remember me for 30 days
      </label>

      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          {/* Cloudflare's script auto-renders this into a widget and injects a
              hidden cf-turnstile-response input inside it once the visitor
              passes the check — that input is picked up automatically by
              `new FormData(e.currentTarget)` in handleSubmit above, no extra
              wiring needed. */}
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
