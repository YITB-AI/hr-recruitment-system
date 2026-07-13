import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This Next.js version (16.2.10) renamed middleware.ts to proxy.ts — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// Proxy only ever does an OPTIMISTIC check here (cookie presence + subdomain
// parsing, no DB call) — the authoritative check lives in lib/auth/session.ts's
// verifySession()/getCurrentUser(), per Next's own documented guidance that
// Proxy must never be the only enforcement layer.

const SESSION_COOKIE_NAME = "session";
const PUBLIC_PATHS = ["/login"];

// Parses the company slug from the subdomain (acme.dax-hr.vercel.app ->
// "acme"). Falls back to DEV_TENANT_SLUG for local dev, where there's no
// real subdomain to parse.
function resolveTenantSlug(request: NextRequest): string | null {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0];
  const rootDomain = process.env.ROOT_DOMAIN;

  if (rootDomain && hostname.endsWith(`.${rootDomain}`)) {
    const subdomain = hostname.slice(0, -(rootDomain.length + 1));
    if (subdomain && subdomain !== "www") return subdomain;
  }

  return process.env.DEV_TENANT_SLUG ?? null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const tenantSlug = resolveTenantSlug(request);
  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) requestHeaders.set("x-tenant-slug", tenantSlug);

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (!isPublicPath && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
