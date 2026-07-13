import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BulkGenerateResultItem } from "@/features/documents/services/generate-document.service";

export function BulkGenerateResults({ batchId, results }: { batchId: string; results: BulkGenerateResultItem[] }) {
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <p className="text-sm font-medium">
          {successCount} generated{failureCount > 0 ? `, ${failureCount} failed` : ""} out of {results.length}
        </p>
        <Link href={`/documents/history?batchId=${batchId}`} className="text-xs font-medium text-primary hover:underline">
          View in History
        </Link>
      </div>

      <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
        {results.map((result, index) => (
          <li key={`${result.recipient.type}:${result.recipient.id}:${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="size-4 text-[var(--success)]" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
              {result.recipientName}
            </span>
            {result.success ? (
              <Badge variant="outline">{result.document.fileName}</Badge>
            ) : (
              <span className="text-xs text-destructive">{result.error}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
