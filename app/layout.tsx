import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Poppins, Roboto, Lora } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAppearanceStyle } from "@/features/settings/services/settings.service";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every font option offered on the Appearance settings page is preloaded
// here so switching fonts is just re-pointing --font-sans at a different
// already-loaded variable (see getAppearanceStyle) — no extra network
// request or flash of unstyled text when a user changes it.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "HR Platform",
    template: "%s · HR Platform",
  },
  description: "Enterprise HR recruitment and employee documentation platform.",
};

// The root layout reads appearance settings from the database on every
// request. Without this, Next.js would prerender any otherwise-static page
// (e.g. /api-docs) once at build time and bake in whatever theme was active
// then — a later appearance change wouldn't show up until the next build.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appearanceStyle = await getAppearanceStyle();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${poppins.variable} ${roboto.variable} ${lora.variable} h-full antialiased`}
      style={appearanceStyle}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={150}>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
