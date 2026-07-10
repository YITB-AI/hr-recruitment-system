import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TemplateForm } from "@/features/documents/components/template-form";

export const metadata: Metadata = { title: "New Template" };

export default function NewTemplatePage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/templates" className="hover:text-foreground">
          Templates
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">New Template</span>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <TemplateForm />
        </CardContent>
      </Card>
    </div>
  );
}
