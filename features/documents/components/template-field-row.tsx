"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  CALCULATION_TYPES,
  CALCULATION_TYPE_LABELS,
} from "@/constants/document-template";
import type { TemplateFieldInput } from "@/validators/document-template";

// Base UI's <Select.Value> renders the raw value unless the Root is given an
// `items` lookup — without these, the type selects showed raw strings like
// "percentage_of_basic" instead of their labels.
const FIELD_TYPE_ITEMS = FIELD_TYPES.map((type) => ({ value: type, label: FIELD_TYPE_LABELS[type] }));
const CALCULATION_TYPE_ITEMS = CALCULATION_TYPES.map((type) => ({ value: type, label: CALCULATION_TYPE_LABELS[type] }));

type TemplateFieldRowProps = {
  field: TemplateFieldInput;
  onChange: (field: TemplateFieldInput) => void;
  onRemove: () => void;
};

export function TemplateFieldRow({ field, onChange, onRemove }: TemplateFieldRowProps) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{`{{${field.key}}}`}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          placeholder="Label (e.g. Employee Name)"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
        />

        <Select
          items={FIELD_TYPE_ITEMS}
          value={field.type}
          onValueChange={(type) =>
            onChange({
              ...field,
              type: type as TemplateFieldInput["type"],
              options: type === "select" ? field.options ?? [""] : undefined,
              calculation: type === "calculated" ? field.calculation ?? { type: "fixed", value: 0 } : undefined,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {FIELD_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {field.type === "select" && (
        <Input
          placeholder="Comma-separated options (e.g. Male, Female)"
          value={(field.options ?? []).join(", ")}
          onChange={(e) =>
            onChange({ ...field, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
          }
        />
      )}

      {field.type === "calculated" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            items={CALCULATION_TYPE_ITEMS}
            value={field.calculation?.type ?? "fixed"}
            onValueChange={(type) =>
              onChange({
                ...field,
                calculation: { type: type as (typeof CALCULATION_TYPES)[number], value: field.calculation?.value ?? 0 },
              })
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
            placeholder={field.calculation?.type === "fixed" ? "Amount (Rs.)" : "Percentage"}
            value={field.calculation?.value ?? 0}
            onChange={(e) =>
              onChange({
                ...field,
                calculation: {
                  type: field.calculation?.type ?? "fixed",
                  value: Number(e.target.value),
                },
              })
            }
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={field.required} onCheckedChange={(v) => onChange({ ...field, required: Boolean(v) })} />
        Required
      </label>
    </div>
  );
}
