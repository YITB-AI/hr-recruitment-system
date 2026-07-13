"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadDocumentImageAction } from "@/actions/documents";
import type { TemplateFieldInput } from "@/validators/document-template";

export type FieldValue = string | boolean | Array<Record<string, string>>;

type TemplateFieldRendererProps = {
  field: TemplateFieldInput;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
};

export function TemplateFieldRenderer({ field, value, onChange }: TemplateFieldRendererProps) {
  const [isUploading, setIsUploading] = useState(false);

  if (field.type === "image") {
    const url = typeof value === "string" ? value : "";

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadDocumentImageAction(formData);
      setIsUploading(false);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onChange(result.url);
    }

    return (
      <div className="space-y-1.5">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        <div className="flex items-center gap-3">
          {url && (
            // eslint-disable-next-line @next/next/no-img-element -- previews a dynamically-uploaded Blob URL, not a static asset
            <img src={url} alt={field.label} className="size-12 rounded border object-cover" />
          )}
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
        {isUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
      </div>
    );
  }

  if (field.type === "conditional") {
    return (
      <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
        <Checkbox checked={Boolean(value)} onCheckedChange={(v) => onChange(Boolean(v))} />
        {field.label}
      </label>
    );
  }

  if (field.type === "table") {
    const rows = Array.isArray(value) ? value : [];
    const columns = field.columns ?? [];

    function updateRow(index: number, columnKey: string, cellValue: string) {
      const next = rows.map((row, i) => (i === index ? { ...row, [columnKey]: cellValue } : row));
      onChange(next);
    }

    function addRow() {
      onChange([...rows, Object.fromEntries(columns.map((c) => [c.key, ""]))]);
    }

    function removeRow(index: number) {
      onChange(rows.filter((_, i) => i !== index));
    }

    return (
      <div className="space-y-1.5 sm:col-span-2">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        <div className="space-y-2 rounded-lg border p-3">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No rows yet.</p>}
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              {columns.map((column) => (
                <div key={column.key} className="min-w-32 flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">{column.label}</Label>
                  <Input value={row[column.key] ?? ""} onChange={(e) => updateRow(i, column.key, e.target.value)} />
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(i)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="size-4" />
            Add row
          </Button>
        </div>
      </div>
    );
  }

  const stringValue = typeof value === "string" ? value : "";

  return (
    <div className="space-y-1.5">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>

      {field.type === "select" ? (
        <Select
          items={(field.options ?? []).map((option) => ({ value: option, label: option }))}
          value={stringValue}
          onValueChange={(v) => onChange(v ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      )}
    </div>
  );
}
