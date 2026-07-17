"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateFieldRow } from "@/features/documents/components/template-field-row";
import { VariablePicker } from "@/features/documents/components/variable-picker";
import { detectVariablesAction, createTemplateAction, updateTemplateAction } from "@/actions/document-templates";
import { TEMPLATE_MILESTONE_TYPES, TEMPLATE_MILESTONE_TYPE_LABELS } from "@/constants/document-template";
import type { TemplateFieldInput } from "@/validators/document-template";
import type { DocumentTemplateRow } from "@/server/repositories/document-template.repository";

const NO_MILESTONE = "__none__";
const MILESTONE_ITEMS = [
  { value: NO_MILESTONE, label: "Not linked to a milestone" },
  ...TEMPLATE_MILESTONE_TYPES.map((type) => ({ value: type, label: TEMPLATE_MILESTONE_TYPE_LABELS[type] })),
];

function prettifyKey(key: string) {
  return key
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TemplateForm({ existing }: { existing?: DocumentTemplateRow }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [fields, setFields] = useState<TemplateFieldInput[]>(existing?.fields ?? []);
  const [fileName, setFileName] = useState<string | null>(existing?.fileName ?? null);
  const [milestoneType, setMilestoneType] = useState<string>(existing?.milestoneType ?? NO_MILESTONE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDetecting, startDetecting] = useTransition();
  const [isSaving, startSaving] = useTransition();

  function handleDetect() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a .docx file first");
      return;
    }
    setFileName(file.name);

    const formData = new FormData();
    formData.set("file", file);

    startDetecting(async () => {
      const result = await detectVariablesAction(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const { flatFields, sections, images } = result.detected;
      if (flatFields.length === 0 && sections.length === 0 && images.length === 0) {
        toast.warning("No {{variables}} found in this document");
        return;
      }

      const existingKeys = new Set(fields.map((f) => f.key));

      const newFlatFields = flatFields
        .filter((key) => !existingKeys.has(key))
        .map<TemplateFieldInput>((key) => ({
          key,
          label: prettifyKey(key),
          type: "text",
          required: true,
        }));

      const newSectionFields = sections
        .filter((section) => !existingKeys.has(section.key))
        .map<TemplateFieldInput>((section) =>
          section.kind === "repeating"
            ? {
                key: section.key,
                label: prettifyKey(section.key),
                type: "table",
                required: false,
                columns: section.columns.map((col) => ({ key: col, label: prettifyKey(col) })),
              }
            : {
                key: section.key,
                label: prettifyKey(section.key),
                type: "conditional",
                required: false,
              },
        );

      const newImageFields = images
        .filter((key) => !existingKeys.has(key))
        .map<TemplateFieldInput>((key) => ({
          key,
          label: prettifyKey(key),
          type: "image",
          required: false,
          imageWidth: 150,
          imageHeight: 150,
        }));

      setFields((prev) => [...prev, ...newFlatFields, ...newSectionFields, ...newImageFields]);
      toast.success(`Detected ${newFlatFields.length + newSectionFields.length + newImageFields.length} field(s)`);
    });
  }

  function addManualField() {
    setFields((prev) => [
      ...prev,
      { key: `field_${prev.length + 1}`, label: "", type: "text", required: false },
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fileInputRef.current?.files?.[0] && !existing) {
      toast.error("Upload a .docx template file");
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("category", category);
    formData.set("description", description);
    formData.set("fields", JSON.stringify(fields));
    if (milestoneType !== NO_MILESTONE) formData.set("milestoneType", milestoneType);
    const file = fileInputRef.current?.files?.[0];
    if (file) formData.set("file", file);

    startSaving(async () => {
      const result = existing
        ? await updateTemplateAction(existing._id, formData)
        : await createTemplateAction(formData);

      if (result && !result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Template Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g. Offer Letter, Termination — Misconduct"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Link to milestone (optional)</Label>
        <Select items={MILESTONE_ITEMS} value={milestoneType} onValueChange={(v) => setMilestoneType(v ?? NO_MILESTONE)}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MILESTONE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          When set, the dashboard&apos;s Upcoming Employee Actions widget will offer this template pre-selected for
          that milestone.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Template File (.docx)</Label>
        <div className="flex items-center gap-2">
          <Input ref={fileInputRef} type="file" accept=".docx" className="max-w-xs" />
          <Button type="button" variant="outline" onClick={handleDetect} disabled={isDetecting}>
            <Upload className="size-4" />
            {isDetecting ? "Detecting..." : "Detect Variables"}
          </Button>
        </div>
        {fileName && <p className="text-xs text-muted-foreground">Current file: {fileName}</p>}
        <p className="text-xs text-muted-foreground">
          Use <code>{"{{variable_name}}"}</code> placeholders in your Word document, then click Detect Variables.
          For images, use <code>{"{{%field_name}}"}</code> (or <code>{"{{%%field_name}}"}</code> to center) on its own
          line.
        </p>
        <div>
          <VariablePicker customKeys={fields.map((f) => f.key)} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Fields</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addManualField}>
            <Plus className="size-4" />
            Add field manually
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No fields yet — upload a template and click Detect Variables, or add one manually.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((field, i) => (
              <TemplateFieldRow
                key={i}
                field={field}
                onChange={(updated) => setFields((prev) => prev.map((f, idx) => (idx === i ? updated : f)))}
                onRemove={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : existing ? "Save Changes" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
