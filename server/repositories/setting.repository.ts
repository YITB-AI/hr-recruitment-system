import { Setting } from "@/models";
import { DEFAULT_PRIMARY_COLOR, DEFAULT_FONT_KEY } from "@/constants/appearance";

export type SettingRow = {
  _id: string;
  companyName: string;
  timezone: string;
  dateFormat: string;
  logoUrl: string | null;
  companyAddress: string | null;
  features: {
    aiResumeAnalysis: boolean;
    smsNotifications: boolean;
    emailNotifications: boolean;
  };
  appearance: {
    primaryColor: string;
    fontKey: string;
  };
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
    features: {
      aiResumeAnalysis: features.aiResumeAnalysis ?? true,
      smsNotifications: features.smsNotifications ?? true,
      emailNotifications: features.emailNotifications ?? true,
    },
    appearance: {
      primaryColor: appearance.primaryColor ?? DEFAULT_PRIMARY_COLOR,
      fontKey: appearance.fontKey ?? DEFAULT_FONT_KEY,
    },
  };
}

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

  async update(companyId: string, input: Partial<{
    companyName: string;
    timezone: string;
    dateFormat: string;
    logoUrl: string;
    companyAddress: string;
    features: Partial<SettingRow["features"]>;
    appearance: Partial<SettingRow["appearance"]>;
  }>): Promise<SettingRow> {
    // Ensure this company's row exists, then merge the partial update — using
    // dot-paths for the nested objects so a partial `features`/`appearance`
    // update doesn't clobber the sibling fields that weren't included.
    await settingRepository.get(companyId);

    const setOps: Record<string, unknown> = {};
    if (input.companyName !== undefined) setOps.companyName = input.companyName;
    if (input.timezone !== undefined) setOps.timezone = input.timezone;
    if (input.dateFormat !== undefined) setOps.dateFormat = input.dateFormat;
    if (input.logoUrl !== undefined) setOps.logoUrl = input.logoUrl;
    if (input.companyAddress !== undefined) setOps.companyAddress = input.companyAddress;
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
