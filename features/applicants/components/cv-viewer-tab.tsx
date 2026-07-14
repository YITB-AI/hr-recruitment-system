"use client";

import { useState } from "react";
import { Download, ExternalLink, FileWarning, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

const PDF_EXTENSIONS = new Set(["pdf"]);
const DOC_EXTENSIONS = new Set(["doc", "docx"]);

function getExtension(url: string): string | null {
  let pathname = url;
  try {
    pathname = new URL(url, "http://localhost").pathname;
  } catch {
    // Not a parseable URL at all — fall through and try the raw string.
  }
  const match = /\.([a-z0-9]+)$/i.exec(pathname);
  return match ? match[1].toLowerCase() : null;
}

export function CvViewerTab({ resumeUrl }: { resumeUrl: string | null }) {
  const [previewFailed, setPreviewFailed] = useState(false);

  if (!resumeUrl) {
    return (
      <EmptyState icon={FileText} title="No resume on file" description="This applicant hasn't provided a resume yet." />
    );
  }

  const extension = getExtension(resumeUrl);
  const canPreviewInline = extension ? PDF_EXTENSIONS.has(extension) : false;
  const isKnownDocFormat = extension ? DOC_EXTENSIONS.has(extension) : false;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {canPreviewInline ? "Previewing the resume below." : "Preview isn't available for this file type."}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<a href={resumeUrl} target="_blank" rel="noopener noreferrer" />}>
            <ExternalLink className="size-3.5" />
            Open in New Tab
          </Button>
          <Button size="sm" render={<a href={resumeUrl} download />}>
            <Download className="size-3.5" />
            Download
          </Button>
        </div>
      </div>

      {canPreviewInline && !previewFailed ? (
        <iframe
          src={resumeUrl}
          title="Resume preview"
          className="h-[70vh] w-full rounded-lg border"
          onError={() => setPreviewFailed(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 p-10 text-center">
          {previewFailed ? (
            <FileWarning className="size-8 text-muted-foreground" />
          ) : (
            <FileText className="size-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {previewFailed
              ? "This file couldn't be previewed — it may be unavailable or you may not have permission to view it."
              : isKnownDocFormat
                ? "Word documents can't be previewed in the browser. Use Download or Open in New Tab."
                : "This file type can't be previewed. Use Download or Open in New Tab."}
          </p>
        </div>
      )}
    </div>
  );
}
