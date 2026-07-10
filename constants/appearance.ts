// Client-safe: no Mongoose/model imports here.

/**
 * A handful of ready-made brand colors (kept in the same lightness/chroma
 * band as the app's default indigo so buttons/badges/focus rings still read
 * correctly against light and dark surfaces) plus a free-form custom picker
 * on the Appearance settings page for anything outside this list.
 */
export const COLOR_PRESETS = [
  { key: "indigo", label: "Indigo", value: "oklch(0.545 0.22 276)" },
  { key: "blue", label: "Blue", value: "oklch(0.55 0.19 250)" },
  { key: "emerald", label: "Emerald", value: "oklch(0.55 0.15 155)" },
  { key: "rose", label: "Rose", value: "oklch(0.58 0.19 15)" },
  { key: "amber", label: "Amber", value: "oklch(0.62 0.16 60)" },
  { key: "violet", label: "Violet", value: "oklch(0.5 0.24 300)" },
] as const;

export const DEFAULT_PRIMARY_COLOR = COLOR_PRESETS[0].value;

/**
 * Font options, each backed by a next/font/google loader in app/layout.tsx.
 * `variable` must match the CSS variable name passed to that font's
 * `variable` option there — this is just the lookup key/label pairing.
 */
export const FONT_OPTIONS = [
  { key: "geist", label: "Geist (Default)", variable: "--font-geist-sans" },
  { key: "inter", label: "Inter", variable: "--font-inter" },
  { key: "poppins", label: "Poppins", variable: "--font-poppins" },
  { key: "roboto", label: "Roboto", variable: "--font-roboto" },
  { key: "lora", label: "Lora (Serif)", variable: "--font-lora" },
] as const;

export type FontKey = (typeof FONT_OPTIONS)[number]["key"];

export const DEFAULT_FONT_KEY: FontKey = "geist";

export const TIMEZONE_OPTIONS = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

export const DATE_FORMAT_OPTIONS = ["MMM D, YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
