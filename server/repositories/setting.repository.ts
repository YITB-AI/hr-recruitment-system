import { Setting } from "@/models";
import { DEFAULT_PRIMARY_COLOR, DEFAULT_FONT_KEY } from "@/constants/appearance";

export type SettingRow = {
  _id: string;
  companyName: string;
  timezone: string;
  dateFormat: string;
  logoUrl: string | null;
  companyAddress: string | null;
  companyContactPhone: string | null;
  companyContactEmail: string | null;
  features: {
    aiResumeAnalysis: boolean;
    smsNotifications: boolean;
    emailNotifications: boolean;
  };
  appearance: {
    primaryColor: string;
    fontKey: string;
    secondaryColor: string | null;
    faviconUrl: string | null;
  };
  weekStartsOn: "sunday" | "monday";
  timeFormat: "12h" | "24h";
  currency: string;
  numberFormat: string;
  multiLanguageEnabled: boolean;
};

type RawRow = Record<string, unknown>;

function serialize(row: RawRow): SettingRow {
  const features = (row.features as Partial<SettingRow["features"]>) ?? {};
  const appearance = (row.appearance as Partial<SettingRow["appearance"]>) ?? {};

  return {
    _id: String(row._id),
    companyName: row.companyName as string,
    timezone: row.timezone as string,
    dateFormat: row.dateFormat as string,
    logoUrl: (row.logoUrl as string | undefined) ?? null,
    companyAddress: (row.companyAddress as string | undefined) ?? null,
    companyContactPhone: (row.companyContactPhone as string | undefined) ?? null,
    companyContactEmail: (row.companyContactEmail as string | undefined) ?? null,
    features: {
      aiResumeAnalysis: features.aiResumeAnalysis ?? true,
      smsNotifications: features.smsNotifications ?? true,
      emailNotifications: features.emailNotifications ?? true,
    },
    appearance: {
      primaryColor: appearance.primaryColor ?? DEFAULT_PRIMARY_COLOR,
      fontKey: appearance.fontKey ?? DEFAULT_FONT_KEY,
      secondaryColor: (appearance.secondaryColor as string | undefined) ?? null,
      faviconUrl: (appearance.faviconUrl as string | undefined) ?? null,
    },
    weekStartsOn: (row.weekStartsOn as SettingRow["weekStartsOn"] | undefined) ?? "monday",
    timeFormat: (row.timeFormat as SettingRow["timeFormat"] | undefined) ?? "12h",
    currency: (row.currency as string | undefined) ?? "USD",
    numberFormat: (row.numberFormat as string | undefined) ?? "1,234.56",
    multiLanguageEnabled: (row.multiLanguageEnabled as boolean | undefined) ?? false,
  };
}

export type SettingUpdateInput = Partial<{
  companyName: string;
  timezone: string;
  dateFormat: string;
  companyAddress: string;
  companyContactPhone: string;
  companyContactEmail: string;
  weekStartsOn: SettingRow["weekStartsOn"];
  timeFormat: SettingRow["timeFormat"];
  currency: string;
  numberFormat: string;
  multiLanguageEnabled: boolean;
  features: Partial<SettingRow["features"]>;
  appearance: Partial<SettingRow["appearance"]>;
}>;

export const settingRepository = {
  /** One Setting document per company — created with defaults on first read if it doesn't exist yet for this companyId. */
  async get(companyId: string): Promise<SettingRow> {
    let row = await Setting.findOne({ companyId }).lean<RawRow | null>();
    if (!row) {
      const created = await Setting.create({ companyId, companyName: "My Company" });
      row = created.toObject();
    }
    return serialize(row);
  },

  async update(companyId: string, input: SettingUpdateInput): Promise<SettingRow> {
    // Ensure this company's row exists, then merge the partial update — using
    // dot-paths for the nested objects so a partial `features`/`appearance`
    // update doesn't clobber the sibling fields that weren't included.
    await settingRepository.get(companyId);

    const setOps: Record<string, unknown> = {};
    if (input.companyName !== undefined) setOps.companyName = input.companyName;
    if (input.timezone !== undefined) setOps.timezone = input.timezone;
    if (input.dateFormat !== undefined) setOps.dateFormat = input.dateFormat;
    if (input.companyAddress !== undefined) setOps.companyAddress = input.companyAddress;
    if (input.companyContactPhone !== undefined) setOps.companyContactPhone = input.companyContactPhone;
    if (input.companyContactEmail !== undefined) setOps.companyContactEmail = input.companyContactEmail;
    if (input.weekStartsOn !== undefined) setOps.weekStartsOn = input.weekStartsOn;
    if (input.timeFormat !== undefined) setOps.timeFormat = input.timeFormat;
    if (input.currency !== undefined) setOps.currency = input.currency;
    if (input.numberFormat !== undefined) setOps.numberFormat = input.numberFormat;
    if (input.multiLanguageEnabled !== undefined) setOps.multiLanguageEnabled = input.multiLanguageEnabled;
    for (const [key, value] of Object.entries(input.features ?? {})) {
      setOps[`features.${key}`] = value;
    }
    for (const [key, value] of Object.entries(input.appearance ?? {})) {
      setOps[`appearance.${key}`] = value;
    }

    const row = await Setting.findOneAndUpdate({ companyId }, { $set: setOps }, { returnDocument: "after" }).lean<RawRow>();
    return serialize(row!);
  },
};
