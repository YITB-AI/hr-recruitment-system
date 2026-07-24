import { CheckCircle2, XCircle } from "lucide-react";
import type { ImportCommitResultItem } from "@/features/employees/services/employee-import.service";

export function EmployeeImportResults({ results }: { results: ImportCommitResultItem[] }) {
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {successCount} imported{failureCount > 0 ? `, ${failureCount} failed` : ""}
      </p>
      <div className="max-h-80 overflow-y-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.map((result) => (
              <tr key={result.row}>
                <td className="px-3 py-2 text-foreground/80">{result.row}</td>
                <td className="px-3 py-2">{result.name || "—"}</td>
                <td className="px-3 py-2">
                  {result.success ? (
                    <span className="flex items-center gap-1.5 text-[var(--success)]">
                      <CheckCircle2 className="size-4" />
                      Added ({result.employeeCode})
                    </span>
                  ) : (
                    <span className="flex items-start gap-1.5 text-destructive">
                      <XCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{result.error}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
