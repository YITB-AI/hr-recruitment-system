import Link from "next/link";
import type { Metadata } from "next";
import { FileText, Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listTemplates } from "@/features/documents/services/document-template.service";
import { DeleteTemplateButton } from "@/features/documents/components/delete-template-button";

export const metadata: Metadata = { title: "Templates" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Templates"
        description="Manage document templates and their variable fields."
        actions={
          <Button nativeButton={false} render={<Link href="/templates/new" />}>
            <Plus className="size-4" />
            New Template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <div className="rounded-2xl border bg-card">
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description="Upload a .docx template with {{variable}} placeholders to get started."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template._id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    render={<Link href={`/templates/${template._id}/edit`} />}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteTemplateButton id={template._id} name={template.name} />
                </div>
              </div>
              <p className="mt-3 font-medium">{template.name}</p>
              <p className="text-sm text-muted-foreground">{template.category}</p>
              {template.description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{template.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="outline">{template.fields.length} field{template.fields.length === 1 ? "" : "s"}</Badge>
                <Badge variant={template.isActive ? "secondary" : "outline"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
