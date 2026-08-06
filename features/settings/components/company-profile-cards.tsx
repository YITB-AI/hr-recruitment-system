"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { updateCompanyConfigurationAction, updateCompanyFeaturesAction } from "@/actions/companies";
import { COMPANY_FEATURE_GROUPS, type CompanyFeatureKey } from "@/constants/company-features";
import { TIMEZONE_OPTIONS, DATE_FORMAT_OPTIONS, COLOR_PRESETS } from "@/constants/appearance";
import type { CompanyRow } from "@/server/repositories/company.repository";
import type { SettingRow } from "@/server/repositories/setting.repository";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "PKR", "AED", "INR"];
const NUMBER_FORMAT_OPTIONS = ["1,234.56", "1.234,56", "1 234.56"];

function DisplayField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

export function CompanyProfileCard({ company }: { company: CompanyRow }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="mb-4 text-sm font-semibold">Company Profile</p>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <DisplayField label="Legal name" value={company.legalName} />
        <DisplayField label="Industry" value={company.industry} />
        <DisplayField label="Company size" value={company.companySize} />
        <DisplayField label="Admin phone" value={company.adminPhone} />
        <DisplayField label="Country" value={company.country} />
        <DisplayField label="Default language" value={company.defaultLanguage} />
      </dl>
    </div>
  );
}

export function CompanyConfigurationCard({ companyId, setting }: { companyId: string; setting: SettingRow }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [timezone, setTimezone] = useState(setting.timezone);
  const [weekStartsOn, setWeekStartsOn] = useState(setting.weekStartsOn);
  const [dateFormat, setDateFormat] = useState(setting.dateFormat);
  const [timeFormat, setTimeFormat] = useState(setting.timeFormat);
  const [currency, setCurrency] = useState(setting.currency);
  const [numberFormat, setNumberFormat] = useState(setting.numberFormat);
  const [multiLanguageEnabled, setMultiLanguageEnabled] = useState(setting.multiLanguageEnabled);
  const [primaryColor, setPrimaryColor] = useState(setting.appearance.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(setting.appearance.secondaryColor ?? COLOR_PRESETS[1].value);
  const [isPending, startTransition] = useTransition();

  function openEdit() {
    setTimezone(setting.timezone);
    setWeekStartsOn(setting.weekStartsOn);
    setDateFormat(setting.dateFormat);
    setTimeFormat(setting.timeFormat);
    setCurrency(setting.currency);
    setNumberFormat(setting.numberFormat);
    setMultiLanguageEnabled(setting.multiLanguageEnabled);
    setPrimaryColor(setting.appearance.primaryColor);
    setSecondaryColor(setting.appearance.secondaryColor ?? COLOR_PRESETS[1].value);
    setIsEditOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateCompanyConfigurationAction({
        companyId,
        timezone,
        weekStartsOn,
        dateFormat,
        timeFormat,
        currency,
        numberFormat,
        multiLanguageEnabled,
        primaryColor,
        secondaryColor,
      });
      if (result.success) {
        toast.success("Configuration updated");
        setIsEditOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">Configuration</p>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <DisplayField label="Timezone" value={setting.timezone} />
        <DisplayField label="Week starts on" value={setting.weekStartsOn === "sunday" ? "Sunday" : "Monday"} />
        <DisplayField label="Date format" value={setting.dateFormat} />
        <DisplayField label="Time format" value={setting.timeFormat === "24h" ? "24-hour" : "12-hour"} />
        <DisplayField label="Currency" value={setting.currency} />
        <DisplayField label="Number format" value={setting.numberFormat} />
        <DisplayField label="Multi-language" value={setting.multiLanguageEnabled ? "Enabled" : "Disabled"} />
        <div>
          <dt className="text-xs text-muted-foreground">Primary color</dt>
          <dd className="mt-1 flex items-center gap-1.5">
            <span className="size-4 rounded-full border" style={{ backgroundColor: setting.appearance.primaryColor }} />
          </dd>
        </div>
        {setting.appearance.secondaryColor && (
          <div>
            <dt className="text-xs text-muted-foreground">Secondary color</dt>
            <dd className="mt-1 flex items-center gap-1.5">
              <span className="size-4 rounded-full border" style={{ backgroundColor: setting.appearance.secondaryColor }} />
            </dd>
          </div>
        )}
      </dl>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit configuration</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={(v) => setTimezone(v ?? timezone)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Week starts on</Label>
              <Select value={weekStartsOn} onValueChange={(v) => setWeekStartsOn((v as "sunday" | "monday") ?? weekStartsOn)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date format</Label>
              <Select value={dateFormat} onValueChange={(v) => setDateFormat(v ?? dateFormat)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((fmt) => <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Time format</Label>
              <Select value={timeFormat} onValueChange={(v) => setTimeFormat((v as "12h" | "24h") ?? timeFormat)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v ?? currency)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Number format</Label>
              <Select value={numberFormat} onValueChange={(v) => setNumberFormat(v ?? numberFormat)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NUMBER_FORMAT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-sm font-medium">Multi-language support</p>
            <Switch checked={multiLanguageEnabled} onCheckedChange={(v) => setMultiLanguageEnabled(!!v)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Primary color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setPrimaryColor(c.value)}
                    className={`size-8 rounded-full border-2 ${primaryColor === c.value ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Secondary color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSecondaryColor(c.value)}
                    className={`size-8 rounded-full border-2 ${secondaryColor === c.value ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CompanyModelAccessCard({ companyId, enabledFeatures }: { companyId: string; enabledFeatures: string[] }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Set<CompanyFeatureKey>>(new Set(enabledFeatures as CompanyFeatureKey[]));
  const [isPending, startTransition] = useTransition();

  function openEdit() {
    setSelected(new Set(enabledFeatures as CompanyFeatureKey[]));
    setIsEditOpen(true);
  }

  function toggle(key: CompanyFeatureKey) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateCompanyFeaturesAction(companyId, Array.from(selected));
      if (result.success) {
        toast.success("Model Access updated");
        setIsEditOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const enabledSet = new Set(enabledFeatures);

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">Model Access</p>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COMPANY_FEATURE_GROUPS.flatMap((g) => g.features)
          .filter((f) => f.isCore || enabledSet.has(f.key))
          .map((f) => (
            <Badge key={f.key} variant="outline">
              {f.label}
              {f.isCore && <span className="ml-1 text-[10px] text-muted-foreground">(core)</span>}
            </Badge>
          ))}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Model Access</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-6 overflow-y-auto py-2">
            {COMPANY_FEATURE_GROUPS.map((group) => (
              <div key={group.key} className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{group.label}</p>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.features.map((feature) => {
                    const checked = feature.isCore || selected.has(feature.key);
                    return (
                      <label
                        key={feature.key}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${feature.isCore ? "bg-muted/40" : "cursor-pointer hover:bg-muted/30"}`}
                      >
                        <Checkbox checked={checked} disabled={feature.isCore} onCheckedChange={() => !feature.isCore && toggle(feature.key)} />
                        <div className="space-y-0.5">
                          <p className="font-medium leading-none">
                            {feature.label} {feature.isCore && <Badge variant="outline" className="ml-1 text-[10px]">Included</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Re-export the shared Input component's type usage is implicit via
// company-detail-header.tsx already importing it -- this file only needs
// the primitives actually used above.
export type { CompanyRow, SettingRow };
void Input;
