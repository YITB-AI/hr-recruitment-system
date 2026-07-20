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
import { FIELD_TYPES, FIELD_TYPE_LABELS } from "@/constants/document-template";
import { TEMPLATE_DATE_FORMAT_PRESETS, TIME_FORMAT_PRESETS } from "@/lib/date-format";
import type { TemplateFieldInput } from "@/validators/document-template";

// Base UI's <Select.Value> renders the raw value unless the Root is given an
// `items` lookup — without these, the type selects showed raw strings like
// "percentage_of_basic" instead of their labels.
const FIELD_TYPE_ITEMS = FIELD_TYPES.map((type) => ({ value: type, label: FIELD_TYPE_LABELS[type] }));
const DATE_FORMAT_ITEMS = TEMPLATE_DATE_FORMAT_PRESETS.map((preset) => ({ value: preset, label: preset }));
const NO_TIME_FORMAT = "__none__";
const TIME_FORMAT_ITEMS = [
  { value: NO_TIME_FORMAT, label: "No time" },
  ...TIME_FORMAT_PRESETS.map((preset) => ({ value: preset, label: preset })),
];

type TemplateFieldRowProps = {
  field: TemplateFieldInput;
  onChange: (field: TemplateFieldInput) => void;
  onRemove: () => void;
};

export function TemplateFieldRow({ field, onChange, onRemove }: TemplateFieldRowProps) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {field.type === "image" ? `{{%${field.key}}}` : `{{${field.key}}}`}
        </code>
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
              // Calculation type/value are no longer configured at
              // template-creation time — see the note above the
              // "calculated" block below.
              calculation: undefined,
              columns: type === "table" ? field.columns ?? [{ key: "", label: "" }] : undefined,
              imageWidth: type === "image" ? field.imageWidth ?? 150 : undefined,
              imageHeight: type === "image" ? field.imageHeight ?? 150 : undefined,
              dateFormat: type === "date" ? field.dateFormat ?? "long" : undefined,
              timeFormat: type === "date" ? field.timeFormat : undefined,
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

      {field.type === "table" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Columns — each row filled in at generation time will have these fields
          </p>
          {(field.columns ?? []).map((column, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Column key (e.g. item_name)"
                value={column.key}
                onChange={(e) => {
                  const columns = [...(field.columns ?? [])];
                  columns[i] = { ...column, key: e.target.value };
                  onChange({ ...field, columns });
                }}
              />
              <Input
                placeholder="Column label (e.g. Item Name)"
                value={column.label}
                onChange={(e) => {
                  const columns = [...(field.columns ?? [])];
                  columns[i] = { ...column, label: e.target.value };
                  onChange({ ...field, columns });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange({ ...field, columns: (field.columns ?? []).filter((_, idx) => idx !== i) })}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...field, columns: [...(field.columns ?? []), { key: "", label: "" }] })}
          >
            Add column
          </Button>
        </div>
      )}

      {field.type === "image" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Render width (px)</p>
            <Input
              type="number"
              min={1}
              value={field.imageWidth ?? 150}
              onChange={(e) => onChange({ ...field, imageWidth: Number(e.target.value) || 150 })}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Render height (px)</p>
            <Input
              type="number"
              min={1}
              value={field.imageHeight ?? 150}
              onChange={(e) => onChange({ ...field, imageHeight: Number(e.target.value) || 150 })}
            />
          </div>
        </div>
      )}

      {field.type === "date" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Date format</p>
            <Select
              items={DATE_FORMAT_ITEMS}
              value={field.dateFormat ?? "long"}
              onValueChange={(preset) => onChange({ ...field, dateFormat: preset as TemplateFieldInput["dateFormat"] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Time format (optional)</p>
            <Select
              items={TIME_FORMAT_ITEMS}
              value={field.timeFormat ?? NO_TIME_FORMAT}
              onValueChange={(preset) =>
                onChange({
                  ...field,
                  timeFormat: preset === NO_TIME_FORMAT ? undefined : (preset as TemplateFieldInput["timeFormat"]),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FORMAT_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {field.type === "calculated" && (
        <p className="rounded-lg bg-accent/60 p-3 text-xs text-accent-foreground">
          The calculation type (% of Basic Salary, % of Gross Salary, or a fixed amount) and its value are chosen
          when generating a document with this template, not here — this lets the same template be reused with
          different amounts for different people or batches.
        </p>
      )}

      {field.type !== "conditional" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={field.required} onCheckedChange={(v) => onChange({ ...field, required: Boolean(v) })} />
          Required
        </label>
      )}
    </div>
  );
}
