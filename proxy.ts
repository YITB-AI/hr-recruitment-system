import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This Next.js version (16.2.10) renamed middleware.ts to proxy.ts — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// Proxy only ever does an OPTIMISTIC check here (cookie presence, no DB
// call) — the authoritative check lives in lib/auth/session.ts's
// verifySession()/getCurrentUser(), per Next's own documented guidance that
// Proxy must never be the only enforcement layer.
//
// Tenant resolution used to be parsed from the subdomain here, but that
// requires a custom domain with real DNS control (subdomains of the shared
// *.vercel.app alias can't get a valid wildcard TLS cert — confirmed by an
// actual failed handshake, not just a DNS lookup). The active company is
// now chosen once at login instead and lives in the session row — see
// actions/auth.ts and lib/auth/session.ts.

const SESSION_COOKIE_NAME = "session";
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (!isPublicPath && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
