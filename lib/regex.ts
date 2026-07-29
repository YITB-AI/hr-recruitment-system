/** Escapes regex metacharacters so a raw user string can be embedded in a RegExp/`$regex` as a literal match. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
