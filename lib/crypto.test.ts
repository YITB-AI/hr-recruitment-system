import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

describe("lib/crypto", () => {
  it("round-trips a plaintext value", () => {
    const plaintext = "a secret value with spaces and $ymb0ls!";
    const ciphertext = encryptSecret(plaintext);
    expect(decryptSecret(ciphertext)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same value");
    const b = encryptSecret("same value");
    expect(a).not.toBe(b);
  });

  it("stores ciphertext in iv:tag:data format", () => {
    const ciphertext = encryptSecret("x");
    expect(ciphertext.split(":")).toHaveLength(3);
  });

  it("rejects a tampered ciphertext (GCM authTag mismatch)", () => {
    const ciphertext = encryptSecret("original value");
    const [iv, tag, data] = ciphertext.split(":");
    const tamperedData = data.slice(0, -2) + (data.slice(-2) === "AA" ? "BB" : "AA");
    expect(() => decryptSecret(`${iv}:${tag}:${tamperedData}`)).toThrow();
  });

  it("rejects malformed ciphertext", () => {
    expect(() => decryptSecret("not-a-real-ciphertext")).toThrow();
  });
});
