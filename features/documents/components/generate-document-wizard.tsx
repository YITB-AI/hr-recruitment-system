"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { WizardSteps } from "@/features/documents/components/wizard-steps";
import { TemplateFieldRenderer } from "@/features/documents/components/template-field-input";
import { generateDocumentAction } from "@/actions/documents";
import { resolveCalculatedValue } from "@/lib/salary-calculation";
import { CALCULATION_TYPE_LABELS } from "@/constants/document-template";
import type { DocumentTemplateRow } from "@/server/repositories/document-template.repository";
import type { EmployeeRow } from "@/server/repositories/employee.repository";
import type { GeneratedDocumentRow } from "@/server/repositories/generated-document.repository";

type GenerateDocumentWizardProps = {
  templates: DocumentTemplateRow[];
  employees: EmployeeRow[];
  initialTemplateId?: string;
};

// Template fields whose key matches a known employee attribute are
// auto-filled from the selected employee's real record — the user only
// types values that aren't already on file (termination date, reason, etc).
function autoFillFromEmployee(key: string, employee: EmployeeRow): string | undefined {
  switch (key.toLowerCase()) {
    case "employee_name":
    case "name":
      return employee.name;
    case "designation":
    case "job_title":
    case "position":
      return employee.designation;
    case "department":
    case "dept":
      return employee.department;
    case "email":
    case "employee_email":
      return employee.email;
    case "basic_salary":
      return String(employee.basicSalary);
    case "gross_salary":
      return String(employee.grossSalary);
    default:
      return undefined;
  }
}

export function GenerateDocumentWizard({ templates, employees, initialTemplateId }: GenerateDocumentWizardProps) {
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GeneratedDocumentRow | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  const selectedTemplate = templates.find((t) => t._id === templateId) ?? null;
  const selectedEmployee = employees.find((e) => e._id === employeeId) ?? null;

  // Base UI's <Select.Value> renders the raw `value` unless the Root is given
  // an `items` lookup — without this it showed the employee/template's raw
  // ObjectId instead of its name.
  const templateItems = useMemo(() => templates.map((t) => ({ value: t._id, label: t.name })), [templates]);
  const employeeItems = useMemo(
    () => employees.map((e) => ({ value: e._id, label: `${e.name} — ${e.designation}` })),
    [employees],
  );

  const inputFields = useMemo(
    () => selectedTemplate?.fields.filter((f) => f.type !== "calculated") ?? [],
    [selectedTemplate],
  );
  const calculatedFields = useMemo(
    () => selectedTemplate?.fields.filter((f) => f.type === "calculated") ?? [],
    [selectedTemplate],
  );

  // Whenever the template or employee selection changes, rebuild the field
  // values: anything matching a known employee attribute is pre-filled from
  // the real record; everything else starts blank for manual entry. Adjusted
  // directly during render (React's recommended pattern for "reset state
  // when a value changes") rather than in an effect, which would otherwise
  // cause an extra cascading render.
  const selectionKey = `${templateId}:${employeeId}`;
  const [valuesKey, setValuesKey] = useState(selectionKey);
  if (valuesKey !== selectionKey) {
    setValuesKey(selectionKey);
    const next: Record<string, string> = {};
    for (const field of selectedTemplate?.fields ?? []) {
      if (field.type === "calculated") continue;
      next[field.key] = (selectedEmployee && autoFillFromEmployee(field.key, selectedEmployee)) ?? "";
    }
    setValues(next);
  }

  function resolvedValueFor(field: (typeof calculatedFields)[number]) {
    if (!selectedEmployee || !field.calculation) return null;
    return resolveCalculatedValue(field.calculation, selectedEmployee);
  }

  // "Generate Another" intentionally keeps the employee selected — you're
  // far more likely to generate a second letter for the same person than to
  // start over from a blank employee picker.
  function reset() {
    setStep(1);
    setTemplateId(""); // values reset automatically by the effect above
    setResult(null);
  }

  function handleGenerate() {
    if (!selectedTemplate || !selectedEmployee) return;

    startGenerating(async () => {
      const response = await generateDocumentAction({ templateId, employeeId, values });
      if (!response.success) {
        toast.error(response.error);
        return;
      }
      setResult(response.document);
      setStep(4);
      toast.success("Document generated");
    });
  }

  return (
    <div className="space-y-6">
      <WizardSteps current={step} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Select Template</Label>
            <Select
              items={templateItems}
              value={templateId}
              onValueChange={(v) => setTemplateId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Select Employee</Label>
            <Select
              items={employeeItems}
              value={employeeId}
              onValueChange={(v) => setEmployeeId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Search employee by name" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    {e.name} — {e.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-accent/60 p-3 text-sm text-accent-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            Choose a template and employee to get started with document generation.
          </div>

          <div className="flex justify-end">
            <Button disabled={!templateId || !employeeId} onClick={() => setStep(2)}>
              Next: Fill Details
            </Button>
          </div>
        </div>
      )}

      {step === 2 && selectedTemplate && (
        <div className="space-y-4">
          {inputFields.length === 0 && calculatedFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">This template has no fields to fill.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {inputFields.map((field) => (
                <TemplateFieldRenderer
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                />
              ))}
            </div>
          )}

          {calculatedFields.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">Calculated fields (auto-filled)</p>
              {calculatedFields.map((field) => (
                <div key={field.key} className="flex items-center justify-between text-sm">
                  <span>{field.label}</span>
                  <span className="font-medium tabular-nums">
                    Rs. {resolvedValueFor(field)?.toLocaleString() ?? "—"}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({field.calculation ? CALCULATION_TYPE_LABELS[field.calculation.type] : ""})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>Next: Preview & Generate</Button>
          </div>
        </div>
      )}

      {step === 3 && selectedTemplate && selectedEmployee && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">
              {selectedTemplate.name} — {selectedEmployee.name}
            </p>
            <dl className="mt-3 space-y-2">
              {inputFields.map((field) => (
                <div key={field.key} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{field.label}</dt>
                  <dd className="font-medium">{values[field.key] || "—"}</dd>
                </div>
              ))}
              {calculatedFields.map((field) => (
                <div key={field.key} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{field.label}</dt>
                  <dd className="font-medium">Rs. {resolvedValueFor(field)?.toLocaleString() ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Document"}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircle2 className="size-12 text-[var(--success)]" />
          <div>
            <p className="font-medium">Document generated successfully</p>
            <p className="text-sm text-muted-foreground">{result.fileName}</p>
          </div>
          <div className="flex gap-2">
            <Button nativeButton={false} render={<a href={result.fileUrl ?? "#"} download />}>
              <Download className="size-4" />
              Download
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="size-4" />
              Generate Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
