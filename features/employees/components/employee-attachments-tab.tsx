"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { withDownloadFilename } from "@/lib/download-url";
import {
  uploadEmployeeAttachmentAction,
  deleteEmployeeAttachmentAction,
} from "@/actions/employee-documents";
import type { EmployeeDocumentRow } from "@/server/repositories/employee-document.repository";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmployeeAttachmentsTab({
  employeeId,
  initialDocuments,
}: {
  employeeId: string;
  initialDocuments: EmployeeDocumentRow[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploading, startUpload] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    startUpload(async () => {
      const result = await uploadEmployeeAttachmentAction(employeeId, formData);
      if (result.success) {
        setDocuments((prev) => [result.document, ...prev]);
        toast.success("File uploaded");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(documentId: string) {
    setDeletingId(documentId);
    startUpload(async () => {
      const result = await deleteEmployeeAttachmentAction(employeeId, documentId);
      if (result.success) {
        setDocuments((prev) => prev.filter((doc) => doc._id !== documentId));
        toast.success("File deleted");
      } else {
        toast.error(result.error);
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          CNIC/passport scans, contracts, and other files for this employee.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <Upload className="size-4" />
          {isUploading ? "Uploading..." : "Upload File"}
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState icon={Paperclip} title="No files yet" description="Uploaded files for this employee will appear here." />
      ) : (
        <ul className="divide-y">
          {documents.map((doc) => (
            <li key={doc._id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Paperclip className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.sizeBytes)} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={withDownloadFilename(`/api/files/${doc.fileKey}`, doc.fileName)}
                  download={doc.fileName}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Download className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(doc._id)}
                  disabled={isUploading && deletingId === doc._id}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete file"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
