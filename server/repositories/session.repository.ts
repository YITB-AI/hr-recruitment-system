import { UserSession } from "@/models";

export type SessionRow = {
  _id: string;
  userId: string;
  companyId: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown; userId: unknown; companyId: unknown };

function serialize(row: RawRow): SessionRow {
  return {
    _id: String(row._id),
    userId: String(row.userId),
    companyId: String(row.companyId),
    userAgent: (row.userAgent as string | undefined) ?? null,
    ipAddress: (row.ipAddress as string | undefined) ?? null,
    lastActiveAt: row.lastActiveAt as Date,
    expiresAt: row.expiresAt as Date,
    createdAt: row.createdAt as Date,
  };
}

export type CreateSessionInput = {
  userId: string;
  companyId: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  impersonatedBy?: string;
};

export const sessionRepository = {
  async create(input: CreateSessionInput): Promise<SessionRow> {
    const doc = await UserSession.create(input);
    return serialize(doc.toObject());
  },
  // Raw Mongoose doc, not the serialized row — callers need revokedAt to
  // decide validity, which the public SessionRow deliberately omits.
  findByTokenHash(tokenHash: string) {
    return UserSession.findOne({ tokenHash });
  },
  async touchLastActive(id: string): Promise<void> {
    await UserSession.updateOne({ _id: id }, { lastActiveAt: new Date() });
  },
  async revoke(tokenHash: string): Promise<void> {
    await UserSession.updateOne({ tokenHash }, { revokedAt: new Date() });
  },
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await UserSession.updateMany({ userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
    return result.modifiedCount;
  },
  async findActiveForUser(userId: string): Promise<SessionRow[]> {
    const rows = await UserSession.find({ userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .sort({ lastActiveAt: -1 })
      .lean<RawRow[]>();
    return rows.map(serialize);
  },
};
