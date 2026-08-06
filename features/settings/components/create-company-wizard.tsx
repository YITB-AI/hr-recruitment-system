"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Layers,
  Sparkles,
  Settings2,
  ClipboardCheck,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPANY_FEATURE_GROUPS, DEFAULT_ENABLED_COMPANY_FEATURES, type CompanyFeatureKey } from "@/constants/company-features";
import { TIMEZONE_OPTIONS, DATE_FORMAT_OPTIONS, COLOR_PRESETS } from "@/constants/appearance";
import { createCompanyAction } from "@/actions/companies";
import type { CreateCompanyResult } from "@/features/settings/services/company-management.service";

const STEPS = [
  { key: "basic", label: "Basic Information", icon: Building2 },
  { key: "features", label: "Features & Modules", icon: Layers },
  { key: "config", label: "Configurations", icon: Settings2 },
  { key: "review", label: "Review & Create", icon: ClipboardCheck },
] as const;

const INDUSTRY_OPTIONS = ["Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education", "Other"];
const COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "500+"];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "PKR", "AED", "INR"];
const NUMBER_FORMAT_OPTIONS = ["1,234.56", "1.234,56", "1 234.56"] as const;

function previewSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "company"
  );
}

type WizardState = {
  name: string;
  adminName: string;
  adminEmail: string;
  legalName: string;
  industry: string;
  companySize: string;
  adminPhone: string;
  country: string;
  defaultLanguage: string;
  enabledFeatures: Set<CompanyFeatureKey>;
  timezone: string;
  weekStartsOn: "sunday" | "monday";
  dateFormat: string;
  timeFormat: "12h" | "24h";
  currency: string;
  numberFormat: string;
  multiLanguageEnabled: boolean;
  primaryColor: string;
  secondaryColor: string;
};

const INITIAL_STATE: WizardState = {
  name: "",
  adminName: "",
  adminEmail: "",
  legalName: "",
  industry: "",
  companySize: "",
  adminPhone: "",
  country: "",
  defaultLanguage: "en",
  enabledFeatures: new Set(DEFAULT_ENABLED_COMPANY_FEATURES),
  timezone: "Asia/Karachi",
  weekStartsOn: "monday",
  dateFormat: "MMM D, YYYY",
  timeFormat: "12h",
  currency: "USD",
  numberFormat: "1,234.56",
  multiLanguageEnabled: false,
  primaryColor: COLOR_PRESETS[0].value,
  secondaryColor: COLOR_PRESETS[1].value,
};

export function CreateCompanyWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreateCompanyResult | null>(null);

  function patch(fields: Partial<WizardState>) {
    setState((s) => ({ ...s, ...fields }));
  }

  function toggleFeature(key: CompanyFeatureKey) {
    setState((s) => {
      const next = new Set(s.enabledFeatures);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...s, enabledFeatures: next };
    });
  }

  const step1Valid = state.name.trim().length > 0 && state.adminName.trim().length > 0 && /\S+@\S+\.\S+/.test(state.adminEmail);
  const canGoNext = step !== 0 || step1Valid;
  const totalFeatureCount = COMPANY_FEATURE_GROUPS.flatMap((g) => g.features).length;
  const coreCount = COMPANY_FEATURE_GROUPS.flatMap((g) => g.features).filter((f) => f.isCore).length;
  const progressPercent = Math.round(((step + 1) / STEPS.length) * 100);

  async function handleSubmit() {
    setIsSubmitting(true);
    const result = await createCompanyAction({
      name: state.name,
      adminName: state.adminName,
      adminEmail: state.adminEmail,
      legalName: state.legalName || undefined,
      industry: state.industry || undefined,
      companySize: state.companySize || undefined,
      adminPhone: state.adminPhone || undefined,
      country: state.country || undefined,
      defaultLanguage: state.defaultLanguage || undefined,
      enabledFeatures: Array.from(state.enabledFeatures),
      timezone: state.timezone,
      weekStartsOn: state.weekStartsOn,
      dateFormat: state.dateFormat,
      timeFormat: state.timeFormat,
      currency: state.currency,
      numberFormat: state.numberFormat,
      multiLanguageEnabled: state.multiLanguageEnabled,
      primaryColor: state.primaryColor,
      secondaryColor: state.secondaryColor,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setCreated(result.result);
  }

  function copyCredentials() {
    if (!created) return;
    const text = `Company ID: ${created.company.slug}\nEmail: ${created.adminEmail}\nPassword: ${created.tempPassword}`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials copied to clipboard");
  }

  if (created) {
    return (
      <div className="mx-auto max-w-lg space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Company created</h1>
            <p className="text-sm text-muted-foreground">
              &quot;{created.company.name}&quot; is live with {state.enabledFeatures.size + coreCount} of {totalFeatureCount} features
              enabled.
            </p>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Company ID:</span> <code>{created.company.slug}</code>
          </p>
          <p>
            <span className="text-muted-foreground">Admin email:</span> {created.adminEmail}
          </p>
          <p>
            <span className="text-muted-foreground">Temporary password:</span> <code>{created.tempPassword}</code>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Share these credentials with the admin over a secure channel. They&apos;ll be required to set their own password on
          first login.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={copyCredentials}>
            <Copy className="size-4" />
            Copy
          </Button>
          <Button onClick={() => router.push(`/platform/companies/${created.company._id}`)}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        {/* Step tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                  isActive
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : isDone
                      ? "border-transparent text-muted-foreground"
                      : "border-transparent text-muted-foreground/60"
                }`}
              >
                {isDone ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
        <Separator />

        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company name *</Label>
                <Input id="companyName" value={state.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Acme Inc" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="legalName">Legal name</Label>
                <Input id="legalName" value={state.legalName} onChange={(e) => patch({ legalName: e.target.value })} placeholder="Acme Incorporated LLC" />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={state.industry} onValueChange={(v) => patch({ industry: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Company size</Label>
                <Select value={state.companySize} onValueChange={(v) => patch({ companySize: v ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt} employees</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={state.country} onChange={(e) => patch({ country: e.target.value })} placeholder="Pakistan" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultLanguage">Default language</Label>
                <Input id="defaultLanguage" value={state.defaultLanguage} onChange={(e) => patch({ defaultLanguage: e.target.value })} placeholder="en" />
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium">First company admin</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="adminName">Admin&apos;s name *</Label>
                <Input id="adminName" value={state.adminName} onChange={(e) => patch({ adminName: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminEmail">Admin&apos;s email *</Label>
                <Input id="adminEmail" type="email" value={state.adminEmail} onChange={(e) => patch({ adminEmail: e.target.value })} placeholder="jane@acme.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminPhone">Admin&apos;s phone</Label>
                <Input id="adminPhone" value={state.adminPhone} onChange={(e) => patch({ adminPhone: e.target.value })} placeholder="+92 300 1234567" />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {COMPANY_FEATURE_GROUPS.map((group) => (
              <div key={group.key} className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{group.label}</p>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.features.map((feature) => {
                    const checked = feature.isCore || state.enabledFeatures.has(feature.key);
                    return (
                      <label
                        key={feature.key}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${feature.isCore ? "bg-muted/40" : "cursor-pointer hover:bg-muted/30"}`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={feature.isCore}
                          onCheckedChange={() => !feature.isCore && toggleFeature(feature.key)}
                        />
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
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium">Platform configuration</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select value={state.timezone} onValueChange={(v) => patch({ timezone: v ?? state.timezone })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Week starts on</Label>
                  <Select value={state.weekStartsOn} onValueChange={(v) => patch({ weekStartsOn: (v as WizardState["weekStartsOn"]) ?? state.weekStartsOn })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date format</Label>
                  <Select value={state.dateFormat} onValueChange={(v) => patch({ dateFormat: v ?? state.dateFormat })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DATE_FORMAT_OPTIONS.map((fmt) => <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Time format</Label>
                  <Select value={state.timeFormat} onValueChange={(v) => patch({ timeFormat: (v as WizardState["timeFormat"]) ?? state.timeFormat })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={state.currency} onValueChange={(v) => patch({ currency: v ?? state.currency })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Number format</Label>
                  <Select value={state.numberFormat} onValueChange={(v) => patch({ numberFormat: v ?? state.numberFormat })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NUMBER_FORMAT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="mt-4 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Multi-language support</p>
                  <p className="text-xs text-muted-foreground">Allow this company to switch the UI to another language later.</p>
                </div>
                <Switch checked={state.multiLanguageEnabled} onCheckedChange={(v) => patch({ multiLanguageEnabled: !!v })} />
              </label>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium">Company branding</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Primary color</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => patch({ primaryColor: c.value })}
                        className={`size-8 rounded-full border-2 ${state.primaryColor === c.value ? "border-foreground" : "border-transparent"}`}
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
                        onClick={() => patch({ secondaryColor: c.value })}
                        className={`size-8 rounded-full border-2 ${state.secondaryColor === c.value ? "border-foreground" : "border-transparent"}`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Logo and favicon can be uploaded from the company&apos;s detail page after it&apos;s created.</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Basic Information</p>
              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Company</dt><dd>{state.name || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Company ID</dt><dd><code>{previewSlug(state.name)}</code></dd></div>
                <div><dt className="text-muted-foreground">Industry</dt><dd>{state.industry || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Size</dt><dd>{state.companySize || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Admin</dt><dd>{state.adminName || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Admin email</dt><dd>{state.adminEmail || "—"}</dd></div>
              </dl>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Features & Modules</p>
              <div className="flex flex-wrap gap-1.5">
                {COMPANY_FEATURE_GROUPS.flatMap((g) => g.features)
                  .filter((f) => f.isCore || state.enabledFeatures.has(f.key))
                  .map((f) => <Badge key={f.key} variant="outline">{f.label}</Badge>)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Configurations</p>
              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Timezone</dt><dd>{state.timezone}</dd></div>
                <div><dt className="text-muted-foreground">Date / time</dt><dd>{state.dateFormat} · {state.timeFormat}</dd></div>
                <div><dt className="text-muted-foreground">Currency</dt><dd>{state.currency}</dd></div>
                <div><dt className="text-muted-foreground">Number format</dt><dd>{state.numberFormat}</dd></div>
                <div><dt className="text-muted-foreground">Multi-language</dt><dd>{state.multiLanguageEnabled ? "Enabled" : "Disabled"}</dd></div>
              </dl>
            </div>
          </div>
        )}

        <Separator />
        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canGoNext} onClick={() => setStep((s) => s + 1)}>
              Next <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button disabled={isSubmitting} loading={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? "Creating…" : "Create Company"}
            </Button>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium">Setup Progress</p>
          <Progress value={progressPercent}>
            <div className="mb-1 flex w-full items-center justify-between text-xs text-muted-foreground">
              <span>Step {step + 1} of {STEPS.length}</span>
              <span>{progressPercent}%</span>
            </div>
          </Progress>
          <ul className="mt-4 space-y-2 text-sm">
            {STEPS.map((s, i) => (
              <li key={s.key} className={`flex items-center gap-2 ${i === step ? "font-medium" : "text-muted-foreground"}`}>
                {i < step ? <Check className="size-3.5 text-primary" /> : <s.icon className="size-3.5" />}
                {s.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            Company Summary
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Company</dt><dd className="font-medium">{state.name || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Company ID</dt><dd><code className="text-xs">{previewSlug(state.name)}</code></dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Admin</dt><dd>{state.adminName || "—"}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Features enabled</dt>
              <dd>{state.enabledFeatures.size + coreCount} / {totalFeatureCount}</dd>
            </div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Timezone</dt><dd>{state.timezone}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <HelpCircle className="size-4" />
            Need help?
          </div>
          <p className="text-xs text-muted-foreground">
            n8n webhook URLs, API keys, and other external configurations are completed by the company&apos;s admin after
            creation, from the company&apos;s Configurations tab.
          </p>
        </div>
      </div>
    </div>
  );
}
