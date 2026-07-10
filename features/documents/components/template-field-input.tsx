"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemplateFieldInput } from "@/validators/document-template";

type TemplateFieldRendererProps = {
  field: TemplateFieldInput;
  value: string;
  onChange: (value: string) => void;
};

export function TemplateFieldRenderer({ field, value, onChange }: TemplateFieldRendererProps) {
  return (
    <div className="space-y-1.5">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>

      {field.type === "select" ? (
        <Select
          items={(field.options ?? []).map((option) => ({ value: option, label: option }))}
          value={value}
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      )}
    </div>
  );
}
