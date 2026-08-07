import { Geist, Geist_Mono, Inter, Poppins, Roboto, Lora } from "next/font/google";
import { FONT_OPTIONS, type FontKey } from "@/constants/appearance";

// Every font a company can pick on the Appearance settings page, loaded ONCE
// here (module scope, so next/font's build-time optimization still applies)
// and shared by app/layout.tsx (applies only the ACTIVE tenant's font
// site-wide) and appearance-settings-form.tsx (applies all of them, but
// scoped to its own preview card, so switching the dropdown previews
// instantly with no new network request — see that file for why).
export const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
export const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"] });
export const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

const FONT_BY_KEY: Record<FontKey, { variable: string }> = {
  geist: geistSans,
  inter,
  poppins,
  roboto,
  lora,
};

export function getFontVariableClass(key: FontKey): string {
  return (FONT_BY_KEY[key] ?? geistSans).variable;
}

// Every option's .variable class, for the Appearance preview card only —
// never spread onto <html> app-wide (see app/layout.tsx).
export const ALL_FONT_VARIABLE_CLASSES = FONT_OPTIONS.map((f) => getFontVariableClass(f.key)).join(" ");
