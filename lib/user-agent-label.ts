// A small, dependency-free heuristic — not real device fingerprinting, just
// enough for a human to recognize their own sessions on the Security page
// ("Chrome on Windows" vs "Safari on iPhone"). Matches this codebase's
// existing bias against a new package for a small parsing job.

const BROWSER_PATTERNS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Chrome\//, "Chrome"],
  [/CriOS\//, "Chrome"],
  [/Firefox\//, "Firefox"],
  [/FxiOS\//, "Firefox"],
  [/Version\/.*Safari\//, "Safari"],
];

const OS_PATTERNS: Array<[RegExp, string]> = [
  [/Windows/, "Windows"],
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Mac OS X/, "Mac"],
  [/Android/, "Android"],
  [/Linux/, "Linux"],
];

function matchFirst(userAgent: string, patterns: Array<[RegExp, string]>): string | null {
  for (const [pattern, label] of patterns) {
    if (pattern.test(userAgent)) return label;
  }
  return null;
}

export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = matchFirst(userAgent, BROWSER_PATTERNS);
  const os = matchFirst(userAgent, OS_PATTERNS);
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
}
