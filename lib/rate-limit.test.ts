import { describe, it, expect } from "vitest";
import { connectDB } from "@/server/db/connect";
import { checkRateLimit } from "@/lib/rate-limit";

describe("lib/rate-limit", () => {
  it("allows requests up to the limit, then rejects", async () => {
    await connectDB();
    // checkRateLimit's fixed window is aligned to absolute epoch time
    // (Math.floor(now / windowMs) * windowMs), not to this test's own start
    // time — so ANY windowMs has some real chance of a boundary landing
    // between two of these sequential round trips under load, flipping r4
    // to a fresh (allowed) window instead of the exhausted one. 10s wasn't
    // wide enough in practice (observed failing intermittently under load,
    // confirmed by re-running standalone vs. in the full suite); an hour is
    // wide enough that this test's brief real duration can't plausibly
    // straddle a boundary regardless of machine load.
    const key = `test-rate-limit-burst-${Date.now()}`;
    const windowMs = 60 * 60 * 1000;
    const r1 = await checkRateLimit(key, 3, windowMs);
    const r2 = await checkRateLimit(key, 3, windowMs);
    const r3 = await checkRateLimit(key, 3, windowMs);
    const r4 = await checkRateLimit(key, 3, windowMs);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
    expect(r1.remaining).toBe(2);
    expect(r4.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window expires", async () => {
    const key = `test-rate-limit-reset-${Date.now()}`;
    const before = await checkRateLimit(key, 3, 800);
    expect(before.allowed).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const after = await checkRateLimit(key, 3, 800);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(2);
  });

  it("handles concurrent requests on a fresh key without a race", async () => {
    const key = `test-rate-limit-race-${Date.now()}`;
    const results = await Promise.all(Array.from({ length: 10 }, () => checkRateLimit(key, 100, 60_000)));
    const counts = results.map((r) => 100 - r.remaining).sort((a, b) => a - b);
    expect(counts).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
  });

  it("treats different keys independently", async () => {
    const result = await checkRateLimit(`test-rate-limit-independent-${Date.now()}`, 1, 60_000);
    expect(result.allowed).toBe(true);
  });
});
