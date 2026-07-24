import { CheckCircle2, XCircle } from "lucide-react";
import type { ImportRowResult } from "@/features/employees/services/employee-import.service";

export function EmployeeImportPreviewTable({ rows }: { rows: ImportRowResult[] }) {
  const readyCount = rows.filter((r) => r.success).length;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {readyCount} of {rows.length} rows ready to import
      </p>
      <div className="max-h-80 overflow-y-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.row}>
                <td className="px-3 py-2 text-foreground/80">{row.row}</td>
                <td className="px-3 py-2">{row.name || "—"}</td>
                <td className="px-3 py-2 text-foreground/80">{row.email || "—"}</td>
                <td className="px-3 py-2">
                  {row.success ? (
                    <span className="flex items-center gap-1.5 text-[var(--success)]">
                      <CheckCircle2 className="size-4" />
                      Ready
                    </span>
                  ) : (
                    <span className="flex items-start gap-1.5 text-destructive">
                      <XCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{row.errors.join("; ")}</span>
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
