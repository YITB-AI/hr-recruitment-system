// Accepts anything with a Headers-like .get() — both a Route Handler's
// real `Request.headers` and a Server Action's `await headers()` (Next's
// ReadonlyHeaders) satisfy this, so one helper covers both call shapes.
type HeaderSource = { get(name: string): string | null };

// Vercel sets x-forwarded-for on every request reaching a serverless
// function — this is trustworthy there (the platform sets it, not the
// client) even though x-forwarded-for is spoofable in a general reverse-
// proxy setup. x-real-ip is a fallback for any other proxy layer.
export function getClientIp(headers: HeaderSource): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
