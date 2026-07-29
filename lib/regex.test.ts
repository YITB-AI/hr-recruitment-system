import { describe, it, expect } from "vitest";
import { escapeRegex } from "@/lib/regex";

describe("lib/regex — escapeRegex", () => {
  it("leaves a plain alphanumeric string unchanged", () => {
    expect(escapeRegex("Jane Doe 123")).toBe("Jane Doe 123");
  });

  it("escapes every regex metacharacter", () => {
    const raw = ".*+?^${}()|[]\\";
    const escaped = escapeRegex(raw);
    expect(new RegExp(`^${escaped}$`).test(raw)).toBe(true);
  });

  it("makes a pathological backtracking pattern match only as a literal string, not hang", () => {
    const pathological = "(a+)+$";
    const escaped = escapeRegex(pathological);
    const start = Date.now();
    const matches = new RegExp(escaped, "i").test(`prefix ${pathological} suffix`);
    expect(Date.now() - start).toBeLessThan(100);
    expect(matches).toBe(true);
    expect(new RegExp(escaped, "i").test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!")).toBe(false);
  });
});
