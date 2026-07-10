import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TemplateForm } from "@/features/documents/components/template-form";
import { getTemplate } from "@/features/documents/services/document-template.service";

export const metadata: Metadata = { title: "Edit Template" };
export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getTemplate(id);

  if (!template) notFound();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/templates" className="hover:text-foreground">
          Templates
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">Edit {template.name}</span>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <TemplateForm existing={template} />
        </CardContent>
      </Card>
    </div>
  );
}
