"use client";

import { useRef, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generalSettingsSchema, type GeneralSettingsInput } from "@/validators/settings";
import { updateGeneralSettingsAction, uploadCompanyLogoAction } from "@/actions/settings";
import { TIMEZONE_OPTIONS, DATE_FORMAT_OPTIONS } from "@/constants/appearance";
import type { SettingRow } from "@/server/repositories/setting.repository";

const TIMEZONE_ITEMS = TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz }));
const DATE_FORMAT_ITEMS = DATE_FORMAT_OPTIONS.map((f) => ({ value: f, label: f }));

function LetterheadLogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const [preview, setPreview] = useState(logoUrl);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadCompanyLogoAction(formData);
      if (result.success) {
        setPreview(URL.createObjectURL(file));
        toast.success("Letterhead logo updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <Label>Letterhead Logo</Label>
      <p className="text-xs text-muted-foreground">
        Shown automatically at the top of every generated document (offer letters, appointment letters, etc.) alongside your company name and address below.
      </p>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-32 items-center justify-center rounded-lg border bg-muted/40">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Letterhead logo" className="max-h-14 max-w-28 object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">No logo</span>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleChange} />
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" />
          {isPending ? "Uploading..." : preview ? "Replace Logo" : "Upload Logo"}
        </Button>
      </div>
    </div>
  );
}

export function GeneralSettingsForm({ settings }: { settings: SettingRow }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GeneralSettingsInput>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      companyName: settings.companyName,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      companyAddress: settings.companyAddress ?? "",
    },
  });

  async function onSubmit(values: GeneralSettingsInput) {
    const result = await updateGeneralSettingsAction(values);
    if (result.success) toast.success("General settings saved");
    else toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-5">
      <LetterheadLogoUpload logoUrl={settings.logoUrl} />

      <div className="space-y-1.5">
        <Label htmlFor="companyName">Company Name</Label>
        <Input id="companyName" {...register("companyName")} />
        {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="companyAddress">Company Address</Label>
        <Textarea id="companyAddress" rows={2} placeholder="Street, City, Country" {...register("companyAddress")} />
        <p className="text-xs text-muted-foreground">Shown next to the logo in the document letterhead.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Timezone</Label>
        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <Select items={TIMEZONE_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Date Format</Label>
        <Controller
          control={control}
          name="dateFormat"
          render={({ field }) => (
            <Select items={DATE_FORMAT_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
