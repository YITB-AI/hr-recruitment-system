import type { Metadata } from "next";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAppearanceStyle } from "@/features/settings/services/settings.service";
import { geistMono, getFontVariableClass } from "@/lib/fonts";
import "./globals.css";

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
  const appearance = await getAppearanceStyle();
  // Only the active tenant's chosen font is loaded site-wide — every other
  // font option a company COULD pick is still loaded (cheap, module-scope)
  // but its .variable class is only ever applied locally, inside the
  // Appearance settings page's own preview card (see appearance-settings-
  // form.tsx), not spread onto every page's <html> element.
  const activeFontVariable = getFontVariableClass(appearance.fontKey);

  return (
    <html
      lang="en"
      className={`${activeFontVariable} ${geistMono.variable} h-full antialiased`}
      style={appearance.style}
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
