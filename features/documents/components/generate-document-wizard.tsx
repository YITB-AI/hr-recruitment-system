"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { WizardSteps } from "@/features/documents/components/wizard-steps";
import { TemplateFieldRenderer, type FieldValue } from "@/features/documents/components/template-field-input";
import { BulkGenerateResults } from "@/features/documents/components/bulk-generate-results";
import { generateDocumentAction, generateDocumentsBulkAction } from "@/actions/documents";
import { resolveCalculatedValue } from "@/lib/salary-calculation";
import { getEmployeeMilestones, formatMilestoneDate } from "@/lib/employee-milestones";
import { formatDateWithPreset } from "@/lib/date-format";
import { CALCULATION_TYPES, CALCULATION_TYPE_LABELS, type CalculationType } from "@/constants/document-template";
import type { DocumentTemplateRow } from "@/server/repositories/document-template.repository";
import type { EmployeeRow } from "@/server/repositories/employee.repository";
import type { ApplicantPickerRow } from "@/server/repositories/applicant.repository";
import type { GeneratedDocumentRow } from "@/server/repositories/generated-document.repository";
import type { BulkGenerateResultItem, CalculatedFieldValue } from "@/features/documents/services/generate-document.service";
import type { DepartmentRow } from "@/server/repositories/department.repository";

const CALCULATION_TYPE_ITEMS = CALCULATION_TYPES.map((type) => ({ value: type, label: CALCULATION_TYPE_LABELS[type] }));
const DEFAULT_CALCULATED_CONFIG: CalculatedFieldValue = { calculationType: "fixed", value: 0 };

type GenerateDocumentWizardProps = {
  templates: DocumentTemplateRow[];
  employees: EmployeeRow[];
  applicants: ApplicantPickerRow[];
  departments: DepartmentRow[];
  initialTemplateId?: string;
  initialEmployeeId?: string;
};

type SelectedRecipient = { type: "employee" | "applicant"; id: string; name: string };

// Template fields whose key matches a known employee attribute are
// auto-filled from the selected employee's real record — the user only
// types values that aren't already on file (termination date, reason, etc).
// (Bulk mode does the equivalent per-recipient server-side — see
// resolveKnownFieldValue in generate-document.service.ts.)
// dateFormat is the field's own override (only meaningful for a "date"-type
// field) — omitted for every other field, which keeps the original
// hardcoded long-form milestone preview unchanged.
function autoFillFromEmployee(key: string, employee: EmployeeRow, dateFormat?: string): string | undefined {
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
    case "department_name":
      return employee.department;
    case "email":
    case "employee_email":
      return employee.email;
    case "basic_salary":
      return String(employee.basicSalary);
    case "gross_salary":
      return String(employee.grossSalary);
    case "joining_date":
      return employee.joiningDate ? formatDateWithPreset(new Date(employee.joiningDate), dateFormat) : undefined;
    case "probation_end_date":
    case "confirmation_date":
    case "increment_eligibility_date":
    case "contract_renewal_date": {
      if (!employee.joiningDate) return undefined;
      const milestones = getEmployeeMilestones(new Date(employee.joiningDate), employee.employmentType);
      switch (key.toLowerCase()) {
        case "probation_end_date":
          return formatMilestoneDate(milestones.probationEndDate, dateFormat);
        case "confirmation_date":
          return formatMilestoneDate(milestones.confirmationDate, dateFormat);
        case "increment_eligibility_date":
          return formatMilestoneDate(milestones.incrementEligibilityDate, dateFormat);
        case "contract_renewal_date":
          return milestones.contractRenewalDate ? formatMilestoneDate(milestones.contractRenewalDate, dateFormat) : undefined;
        default:
          return undefined;
      }
    }
    default:
      return undefined;
  }
}

function hasPreviewableValue(field: { type: string }, value: FieldValue | undefined): boolean {
  if (field.type === "table") return Array.isArray(value) && value.length > 0;
  if (field.type === "conditional") return Boolean(value);
  return typeof value === "string" && value.trim() !== "";
}

function formatFieldValueForPreview(field: { type: string }, value: FieldValue | undefined): string {
  if (field.type === "conditional") return value ? "Yes" : "No";
  if (field.type === "table") {
    const rows = Array.isArray(value) ? value : [];
    return rows.length > 0 ? `${rows.length} row${rows.length === 1 ? "" : "s"}` : "—";
  }
  if (field.type === "image") return typeof value === "string" && value ? "Uploaded" : "—";
  return typeof value === "string" && value ? value : "—";
}

export function GenerateDocumentWizard({
  templates,
  employees,
  applicants,
  departments,
  initialTemplateId,
  initialEmployeeId,
}: GenerateDocumentWizardProps) {
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? "");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [recipientFilter, setRecipientFilter] = useState("");
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [calculatedConfigs, setCalculatedConfigs] = useState<Record<string, CalculatedFieldValue>>({});
  const [result, setResult] = useState<GeneratedDocumentRow | null>(null);
  const [bulkResult, setBulkResult] = useState<{ batchId: string; results: BulkGenerateResultItem[] } | null>(null);
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

  const recipientOptions = useMemo(
    () => [
      ...employees.map((e) => ({ type: "employee" as const, id: e._id, name: e.name, sub: e.designation })),
      ...applicants.map((a) => ({ type: "applicant" as const, id: a._id, name: a.name, sub: a.email })),
    ],
    [employees, applicants],
  );
  const filteredRecipientOptions = useMemo(
    () => recipientOptions.filter((r) => r.name.toLowerCase().includes(recipientFilter.toLowerCase())),
    [recipientOptions, recipientFilter],
  );

  function toggleRecipient(option: (typeof recipientOptions)[number]) {
    setSelectedRecipients((prev) => {
      const exists = prev.some((r) => r.id === option.id && r.type === option.type);
      if (exists) return prev.filter((r) => !(r.id === option.id && r.type === option.type));
      return [...prev, { type: option.type, id: option.id, name: option.name }];
    });
  }

  const inputFields = useMemo(
    () => selectedTemplate?.fields.filter((f) => f.type !== "calculated") ?? [],
    [selectedTemplate],
  );
  const calculatedFields = useMemo(
    () => selectedTemplate?.fields.filter((f) => f.type === "calculated") ?? [],
    [selectedTemplate],
  );

  // Whenever the template/employee/recipient selection changes, rebuild the
  // field values: in single mode, anything matching a known employee
  // attribute is pre-filled from the real record; in bulk mode all fields
  // start blank (per-recipient autofill happens server-side, one shared
  // value here applies to everyone). Adjusted directly during render
  // (React's recommended pattern for "reset state when a value changes")
  // rather than in an effect, which would otherwise cause an extra
  // cascading render.
  const selectionKey = bulkMode
    ? `bulk:${templateId}:${selectedRecipients.map((r) => `${r.type}:${r.id}`).join(",")}`
    : `${templateId}:${employeeId}`;
  const [valuesKey, setValuesKey] = useState(selectionKey);
  if (valuesKey !== selectionKey) {
    setValuesKey(selectionKey);
    const next: Record<string, FieldValue> = {};
    for (const field of selectedTemplate?.fields ?? []) {
      if (field.type === "calculated") continue;
      if (field.type === "table") {
        next[field.key] = [];
      } else if (field.type === "conditional") {
        next[field.key] = false;
      } else {
        next[field.key] =
          bulkMode ? "" : (selectedEmployee && autoFillFromEmployee(field.key, selectedEmployee, field.dateFormat)) ?? "";
      }
    }
    setValues(next);

    const nextCalculated: Record<string, CalculatedFieldValue> = {};
    for (const field of calculatedFields) {
      nextCalculated[field.key] = DEFAULT_CALCULATED_CONFIG;
    }
    setCalculatedConfigs(nextCalculated);
  }

  function configFor(field: (typeof calculatedFields)[number]): CalculatedFieldValue {
    return calculatedConfigs[field.key] ?? DEFAULT_CALCULATED_CONFIG;
  }

  function resolvedValueFor(field: (typeof calculatedFields)[number]) {
    if (!selectedEmployee) return null;
    const config = configFor(field);
    return resolveCalculatedValue({ type: config.calculationType, value: config.value }, selectedEmployee);
  }

  function updateCalculatedConfig(fieldKey: string, patch: Partial<CalculatedFieldValue>) {
    setCalculatedConfigs((prev) => ({
      ...prev,
      [fieldKey]: { ...(prev[fieldKey] ?? DEFAULT_CALCULATED_CONFIG), ...patch },
    }));
  }

  // "Generate Another" intentionally keeps the employee/recipients selected
  // — you're far more likely to generate a second letter for the same
  // person/batch than to start over from a blank picker.
  function reset() {
    setStep(1);
    setTemplateId(""); // values reset automatically by the effect above
    setResult(null);
    setBulkResult(null);
  }

  // Calculated fields' type/value live in their own state (not `values`,
  // which TemplateFieldRenderer owns the shape of) — merged in here right
  // before the server action call.
  function buildValuesPayload(): Record<string, FieldValue | CalculatedFieldValue> {
    const merged: Record<string, FieldValue | CalculatedFieldValue> = { ...values };
    for (const field of calculatedFields) {
      merged[field.key] = configFor(field);
    }
    return merged;
  }

  function handleGenerate() {
    if (!selectedTemplate || !selectedEmployee) return;

    startGenerating(async () => {
      const response = await generateDocumentAction({ templateId, employeeId, values: buildValuesPayload() });
      if (!response.success) {
        toast.error(response.error);
        return;
      }
      setResult(response.document);
      setStep(4);
      toast.success("Document generated");
    });
  }

  function handleBulkGenerate() {
    if (!selectedTemplate || selectedRecipients.length === 0) return;

    startGenerating(async () => {
      const response = await generateDocumentsBulkAction({
        templateId,
        recipients: selectedRecipients,
        values: buildValuesPayload(),
      });
      if (!response.success) {
        toast.error(response.error);
        return;
      }
      setBulkResult({ batchId: response.batchId, results: response.results });
      setStep(4);
      const failed = response.results.filter((r) => !r.success).length;
      if (failed > 0) toast.error(`${response.results.length - failed} generated, ${failed} failed`);
      else toast.success(`${response.results.length} documents generated`);
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

          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-medium">Bulk generation</span>
              <span className="block text-xs text-muted-foreground">Generate this document for multiple people at once.</span>
            </span>
            <input
              type="checkbox"
              checked={bulkMode}
              onChange={(e) => {
                setBulkMode(e.target.checked);
                setEmployeeId("");
                setSelectedRecipients([]);
              }}
              className="size-5 accent-primary"
            />
          </label>

          {!bulkMode ? (
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
          ) : (
            <div className="space-y-1.5">
              <Label>Select Recipients ({selectedRecipients.length} selected)</Label>
              <Input
                placeholder="Search employees or applicants..."
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value)}
              />
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
                {filteredRecipientOptions.map((option) => {
                  const checked = selectedRecipients.some((r) => r.id === option.id && r.type === option.type);
                  return (
                    <label
                      key={`${option.type}:${option.id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRecipient(option)}
                        className="size-4 accent-primary"
                      />
                      <span className="flex-1 truncate">{option.name}</span>
                      <Badge variant="outline" className="capitalize">
                        {option.type}
                      </Badge>
                    </label>
                  );
                })}
                {filteredRecipientOptions.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">No matches.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-accent/60 p-3 text-sm text-accent-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            {bulkMode
              ? "Choose a template, then select everyone who should receive it."
              : "Choose a template and employee to get started with document generation."}
          </div>

          <div className="flex justify-end">
            <Button
              disabled={!templateId || (bulkMode ? selectedRecipients.length === 0 : !employeeId)}
              onClick={() => setStep(2)}
            >
              Next: Fill Details
            </Button>
          </div>
        </div>
      )}

      {step === 2 && selectedTemplate && (
        <div className="space-y-4">
          {bulkMode && (
            <div className="flex items-start gap-2 rounded-lg bg-accent/60 p-3 text-sm text-accent-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              Values you enter here apply to every selected recipient. Common fields (name, email, department,
              designation, salary) auto-fill per recipient when left blank.
            </div>
          )}

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
                  departments={departments}
                />
              ))}
            </div>
          )}

          {calculatedFields.length > 0 && (
            <div className="space-y-4 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Calculated fields{bulkMode ? " — applies to every selected recipient" : ""}
              </p>
              {calculatedFields.map((field) => {
                const config = configFor(field);
                return (
                  <div key={field.key} className="space-y-2">
                    <Label>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Select
                        items={CALCULATION_TYPE_ITEMS}
                        value={config.calculationType}
                        onValueChange={(type) =>
                          updateCalculatedConfig(field.key, { calculationType: (type as CalculationType) ?? "fixed" })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CALCULATION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {CALCULATION_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder={config.calculationType === "fixed" ? "Amount (Rs.)" : "Percentage"}
                        value={config.value}
                        onChange={(e) => updateCalculatedConfig(field.key, { value: Number(e.target.value) })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bulkMode
                        ? "Computed per recipient using this configuration."
                        : `Rs. ${resolvedValueFor(field)?.toLocaleString() ?? "—"}`}
                    </p>
                  </div>
                );
              })}
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

      {step === 3 && selectedTemplate && (bulkMode ? selectedRecipients.length > 0 : selectedEmployee) && (
        <div className="space-y-4">
          {bulkMode ? (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">
                {selectedTemplate.name} — {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? "" : "s"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedRecipients.map((r) => (
                  <Badge key={`${r.type}:${r.id}`} variant="outline">
                    {r.name}
                  </Badge>
                ))}
              </div>
              {(inputFields.some((f) => hasPreviewableValue(f, values[f.key])) || calculatedFields.length > 0) && (
                <dl className="mt-4 space-y-2 border-t pt-3">
                  {inputFields
                    .filter((f) => hasPreviewableValue(f, values[f.key]))
                    .map((field) => (
                      <div key={field.key} className="flex justify-between text-sm">
                        <dt className="text-muted-foreground">{field.label}</dt>
                        <dd className="font-medium">{formatFieldValueForPreview(field, values[field.key])}</dd>
                      </div>
                    ))}
                  {calculatedFields.map((field) => {
                    const config = configFor(field);
                    return (
                      <div key={field.key} className="flex justify-between text-sm">
                        <dt className="text-muted-foreground">{field.label}</dt>
                        <dd className="font-medium">
                          {CALCULATION_TYPE_LABELS[config.calculationType]}
                          {config.calculationType === "fixed" ? ` — Rs. ${config.value.toLocaleString()}` : ` — ${config.value}%`}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>
          ) : (
            selectedEmployee && (
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">
                  {selectedTemplate.name} — {selectedEmployee.name}
                </p>
                <dl className="mt-3 space-y-2">
                  {inputFields.map((field) => (
                    <div key={field.key} className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{field.label}</dt>
                      <dd className="font-medium">{formatFieldValueForPreview(field, values[field.key])}</dd>
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
            )
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={bulkMode ? handleBulkGenerate : handleGenerate} disabled={isGenerating}>
              {isGenerating
                ? "Generating..."
                : bulkMode
                  ? `Generate ${selectedRecipients.length} Document${selectedRecipients.length === 1 ? "" : "s"}`
                  : "Generate Document"}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && bulkMode && bulkResult && (
        <div className="space-y-4">
          <BulkGenerateResults batchId={bulkResult.batchId} results={bulkResult.results} />
          <div className="flex justify-center">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="size-4" />
              Generate Another Batch
            </Button>
          </div>
        </div>
      )}

      {step === 4 && !bulkMode && result && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircle2 className="size-12 text-[var(--success)]" />
          <div>
            <p className="font-medium">Document generated successfully</p>
            <p className="text-sm text-muted-foreground">{result.fileName}</p>
          </div>
          <div className="flex gap-2">
            <Button
              nativeButton={false}
              render={<a href={(result.pdfStatus === "ready" && result.pdfUrl) || result.fileUrl || "#"} download />}
            >
              <Download className="size-4" />
              {result.pdfStatus === "ready" ? "Download PDF" : "Download"}
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="size-4" />
              Generate Another
            </Button>
          </div>
          {result.pdfStatus === "failed" && (
            <p className="text-xs text-muted-foreground">
              PDF conversion failed — downloading the original Word document instead.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
