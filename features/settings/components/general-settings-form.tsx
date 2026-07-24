"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generalSettingsSchema, type GeneralSettingsInput } from "@/validators/settings";
import { updateGeneralSettingsAction } from "@/actions/settings";
import { TIMEZONE_OPTIONS, DATE_FORMAT_OPTIONS } from "@/constants/appearance";
import type { SettingRow } from "@/server/repositories/setting.repository";

const TIMEZONE_ITEMS = TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz }));
const DATE_FORMAT_ITEMS = DATE_FORMAT_OPTIONS.map((f) => ({ value: f, label: f }));

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
    },
  });

  async function onSubmit(values: GeneralSettingsInput) {
    const result = await updateGeneralSettingsAction(values);
    if (result.success) toast.success("General settings saved");
    else toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="companyName">Company Name</Label>
        <Input id="companyName" {...register("companyName")} />
        {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
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
