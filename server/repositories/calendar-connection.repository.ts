import { CalendarConnection } from "@/models";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { CalendarProvider } from "@/models/CalendarConnection";

export type CalendarConnectionRow = {
  _id: string;
  userId: string;
  provider: CalendarProvider;
  providerAccountEmail: string | null;
  lastError: string | null;
  connectedAt: Date;
};

export type ResolvedCalendarTokens = {
  _id: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): CalendarConnectionRow {
  return {
    _id: String(row._id),
    userId: String(row.userId),
    provider: row.provider as CalendarProvider,
    providerAccountEmail: (row.providerAccountEmail as string | undefined) ?? null,
    lastError: (row.lastError as string | undefined) ?? null,
    connectedAt: row.createdAt as Date,
  };
}

export const calendarConnectionRepository = {
  async findByUserId(userId: string): Promise<CalendarConnectionRow[]> {
    const rows = await CalendarConnection.find({ userId }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findByUserAndProvider(userId: string, provider: CalendarProvider): Promise<CalendarConnectionRow | null> {
    const row = await CalendarConnection.findOne({ userId, provider }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  // Batch lookup for multi-interviewer conflict checks — avoids N+1 queries
  // when checking several interviewers' calendars for one scheduling
  // attempt.
  async findManyByUserIds(userIds: string[], provider: CalendarProvider): Promise<ResolvedCalendarTokens[]> {
    if (userIds.length === 0) return [];
    const rows = await CalendarConnection.find({ userId: { $in: userIds }, provider })
      .select("accessTokenEncrypted refreshTokenEncrypted tokenExpiresAt")
      .lean<Array<RawRow & { accessTokenEncrypted: string; refreshTokenEncrypted: string; tokenExpiresAt: Date }>>();
    return rows.map((row) => ({
      _id: String(row._id),
      accessToken: decryptSecret(row.accessTokenEncrypted),
      refreshToken: decryptSecret(row.refreshTokenEncrypted),
      tokenExpiresAt: row.tokenExpiresAt,
    }));
  },
  async getResolvedTokens(userId: string, provider: CalendarProvider): Promise<ResolvedCalendarTokens | null> {
    const row = await CalendarConnection.findOne({ userId, provider })
      .select("accessTokenEncrypted refreshTokenEncrypted tokenExpiresAt")
      .lean<{ _id: unknown; accessTokenEncrypted: string; refreshTokenEncrypted: string; tokenExpiresAt: Date } | null>();
    if (!row) return null;
    return {
      _id: String(row._id),
      accessToken: decryptSecret(row.accessTokenEncrypted),
      refreshToken: decryptSecret(row.refreshTokenEncrypted),
      tokenExpiresAt: row.tokenExpiresAt,
    };
  },
  async upsert(input: {
    userId: string;
    companyId: string;
    provider: CalendarProvider;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    scope?: string;
    providerAccountEmail?: string;
  }): Promise<void> {
    await CalendarConnection.findOneAndUpdate(
      { userId: input.userId, provider: input.provider },
      {
        $set: {
          companyId: input.companyId,
          accessTokenEncrypted: encryptSecret(input.accessToken),
          refreshTokenEncrypted: encryptSecret(input.refreshToken),
          tokenExpiresAt: input.tokenExpiresAt,
          scope: input.scope,
          providerAccountEmail: input.providerAccountEmail,
        },
        $unset: { lastError: "" },
      },
      { upsert: true },
    );
  },
  async updateTokens(id: string, input: { accessToken: string; refreshToken?: string; tokenExpiresAt: Date }): Promise<void> {
    const setOps: Record<string, unknown> = {
      accessTokenEncrypted: encryptSecret(input.accessToken),
      tokenExpiresAt: input.tokenExpiresAt,
    };
    if (input.refreshToken) setOps.refreshTokenEncrypted = encryptSecret(input.refreshToken);
    await CalendarConnection.updateOne({ _id: id }, { $set: setOps, $unset: { lastError: "" } });
  },
  async setLastError(id: string, error: string): Promise<void> {
    await CalendarConnection.updateOne({ _id: id }, { $set: { lastError: error } });
  },
  async delete(userId: string, provider: CalendarProvider): Promise<void> {
    await CalendarConnection.deleteOne({ userId, provider });
  },
};
