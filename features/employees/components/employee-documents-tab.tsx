import { Download, FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import type { GeneratedDocumentRow } from "@/server/repositories/generated-document.repository";

export function EmployeeDocumentsTab({ documents }: { documents: GeneratedDocumentRow[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Documents generated for this employee will appear here."
      />
    );
  }

  return (
    <ul className="divide-y">
      {documents.map((doc) => (
        <li key={doc._id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {doc.template?.name ?? "Unknown template"} ·{" "}
                {new Date(doc.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {doc.status}
            </Badge>
            {(doc.pdfUrl || doc.fileUrl) && (
              <a
                href={(doc.pdfStatus === "ready" && doc.pdfUrl) || doc.fileUrl || "#"}
                download
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Download className="size-4" />
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
