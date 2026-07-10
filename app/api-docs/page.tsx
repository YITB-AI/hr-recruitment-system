import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { SwaggerUiView } from "@/components/swagger/swagger-ui-view";

export const metadata: Metadata = { title: "API Docs" };

// Standalone page (outside the app shell/sidebar) — this is a developer
// tool for testing the REST endpoints directly, not part of the HR product UI.
export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to app
        </Link>
        <h1 className="text-sm font-semibold">HR Recruitment System — API Docs</h1>
      </div>
      <SwaggerUiView />
    </div>
  );
}
