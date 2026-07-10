import Link from "next/link";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { DocumentTemplateRow } from "@/server/repositories/document-template.repository";

export function PopularTemplates({ templates }: { templates: DocumentTemplateRow[] }) {
  if (templates.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No templates yet"
        description="Create a template first to start generating documents."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {templates.slice(0, 6).map((template) => (
        <div key={template._id} className="rounded-xl border p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" />
          </div>
          <p className="mt-2.5 text-sm font-medium">{template.name}</p>
          {template.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{template.description}</p>
          )}
          <Link
            href={`/documents?templateId=${template._id}`}
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            Use Template
          </Link>
        </div>
      ))}
    </div>
  );
}
