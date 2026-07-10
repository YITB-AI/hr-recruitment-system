"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLOR_PRESETS, FONT_OPTIONS } from "@/constants/appearance";
import { updateAppearanceSettingsAction } from "@/actions/settings";
import type { SettingRow } from "@/server/repositories/setting.repository";

const FONT_ITEMS = FONT_OPTIONS.map((f) => ({ value: f.key, label: f.label }));

export function AppearanceSettingsForm({ settings }: { settings: SettingRow }) {
  const router = useRouter();
  const [primaryColor, setPrimaryColor] = useState(settings.appearance.primaryColor);
  const [fontKey, setFontKey] = useState(settings.appearance.fontKey);
  const [isSaving, startSaving] = useTransition();

  const selectedFont = FONT_OPTIONS.find((f) => f.key === fontKey) ?? FONT_OPTIONS[0];
  // Preview-only style, scoped to the card below — saving is what applies it
  // app-wide (the root layout reads the persisted value, not this state).
  const previewStyle = { "--primary": primaryColor, fontFamily: `var(${selectedFont.variable})` } as React.CSSProperties;

  function handleSave() {
    startSaving(async () => {
      const result = await updateAppearanceSettingsAction({ primaryColor, fontKey });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Appearance updated");
      router.refresh();
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-2">
        <Label>Brand Color</Label>
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              title={preset.label}
              onClick={() => setPrimaryColor(preset.value)}
              className="relative flex size-9 items-center justify-center rounded-full border"
              style={{ backgroundColor: preset.value }}
            >
              {primaryColor === preset.value && <Check className="size-4 text-white drop-shadow" />}
            </button>
          ))}

          <label
            className="relative flex size-9 cursor-pointer items-center justify-center rounded-full border bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] text-[10px] font-medium text-white"
            title="Custom color"
          >
            <input
              type="color"
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            +
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Pick a preset or use the custom color picker.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Font</Label>
        <Select items={FONT_ITEMS} value={fontKey} onValueChange={(v) => setFontKey(v ?? fontKey)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.key} value={font.key}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Preview</Label>
        <div style={previewStyle} className="rounded-xl border p-4">
          <p className="text-sm">The quick brown fox jumps over the lazy dog.</p>
          <Button className="mt-3" style={{ backgroundColor: "var(--primary)" }}>
            Sample Button
          </Button>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Appearance"}
      </Button>
    </div>
  );
}
