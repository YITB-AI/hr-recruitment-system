const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare Turnstile CAPTCHA on login. A plain fetch, not an SDK — matches
// this codebase's existing bias against pulling in a package for a single
// REST call (same reasoning already used for the Outlook calendar client).
//
// Returns true (skips verification) when TURNSTILE_SECRET_KEY isn't
// configured — CAPTCHA is genuinely optional until the owner provisions a
// real Cloudflare Turnstile site and hands over the site/secret key pair;
// failing every login closed until then would be a real regression to
// production, not a security improvement.
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;
  if (!token) return false;

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { success: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification request failed:", error);
    return false;
  }
}
