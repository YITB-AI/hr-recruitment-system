import { Status } from "@/models";
import type { StatusModule } from "@/constants/status-module";

export type StatusRow = {
  _id: string;
  module: StatusModule;
  key: string;
  name: string;
  color: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  isDefault: boolean;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): StatusRow {
  return {
    _id: String(row._id),
    module: row.module as StatusModule,
    key: row.key as string,
    name: row.name as string,
    color: row.color as string,
    icon: (row.icon as string | undefined) ?? null,
    order: row.order as number,
    isActive: Boolean(row.isActive),
    isDefault: Boolean(row.isDefault),
  };
}

// Seeded once per company/module the first time its statuses are read (see
// statusRepository.findAllForModule) — mirrors how Setting rows are
// upserted lazily on first access elsewhere in this app, rather than a
// one-time global migration script. Every key here is either an existing
// stored value on real Applicant/Employee documents (never renamed) or a
// genuinely new addition — see the comment on models/Status.ts.
const DEFAULT_SEEDS: Record<StatusModule, Array<{ key: string; name: string; color: string; icon?: string }>> = {
  applicant: [
    { key: "new", name: "New", color: "#2a78d6", icon: "Inbox" },
    { key: "applied", name: "Applied", color: "#5b8def", icon: "Send" },
    { key: "screening", name: "Screening", color: "#eb6834", icon: "UserSearch" },
    { key: "ai_screening", name: "AI Screening", color: "#0891b2", icon: "Sparkles" },
    { key: "shortlisted", name: "Shortlisted", color: "#0ca30c", icon: "ListChecks" },
    { key: "interview", name: "Interview Scheduled", color: "#4a3aa7", icon: "CalendarClock" },
    { key: "interview_completed", name: "Interview Completed", color: "#6d28d9", icon: "CalendarCheck2" },
    { key: "selected", name: "Selected", color: "#16a34a", icon: "Star" },
    { key: "offer", name: "Offer Sent", color: "#1baf7a", icon: "Send" },
    { key: "offer_accepted", name: "Offer Accepted", color: "#059669", icon: "ThumbsUp" },
    { key: "offer_declined", name: "Offer Declined", color: "#b45309", icon: "ThumbsDown" },
    { key: "hired", name: "Hired", color: "#0ca30c", icon: "UserCheck" },
    { key: "joined", name: "Joined", color: "#0d9488", icon: "UserCheck" },
    { key: "on_hold", name: "On Hold", color: "#d97706", icon: "PauseCircle" },
    { key: "not_interested", name: "Not Interested", color: "#64748b", icon: "XCircle" },
    { key: "not_available", name: "Not Available", color: "#475569", icon: "PhoneMissed" },
    { key: "no_response", name: "No Response", color: "#71717a", icon: "MailQuestion" },
    { key: "followup_required", name: "Follow-up Required", color: "#0ea5e9", icon: "Repeat" },
    { key: "future_opportunity", name: "Future Opportunity", color: "#7c3aed", icon: "Clock3" },
    { key: "duplicate", name: "Duplicate Applicant", color: "#78716c", icon: "Copy" },
    { key: "withdrawn", name: "Withdrawn", color: "#e11d48", icon: "LogOut" },
    { key: "rejected", name: "Rejected", color: "#d03b3b", icon: "Ban" },
    { key: "incomplete", name: "Incomplete", color: "#898781", icon: "Inbox" },
    { key: "archived", name: "Archived", color: "#52525b", icon: "Archive" },
  ],
  employee: [
    { key: "active", name: "Active", color: "#0ca30c" },
    { key: "on_leave", name: "On Leave", color: "#4a3aa7" },
    { key: "probation", name: "Probation", color: "#eda100" },
    { key: "notice_period", name: "Notice Period", color: "#eb6834" },
    { key: "resigned", name: "Resigned", color: "#b45309" },
    { key: "terminated", name: "Terminated", color: "#d03b3b" },
    { key: "inactive", name: "Inactive", color: "#71717a" },
  ],
};

async function seedDefaults(companyId: string, module: StatusModule): Promise<void> {
  const seeds = DEFAULT_SEEDS[module];
  await Status.insertMany(
    seeds.map((seed, index) => ({
      companyId,
      module,
      key: seed.key,
      name: seed.name,
      color: seed.color,
      icon: seed.icon,
      order: index,
      isActive: true,
      isDefault: true,
    })),
    { ordered: false },
  ).catch(() => {
    // A concurrent request already seeded this company/module — the unique
    // {companyId, module, key} index rejects the duplicates, which is fine.
  });
}

export type CreateStatusInput = {
  companyId: string;
  module: StatusModule;
  key: string;
  name: string;
  color: string;
  icon?: string;
  createdBy?: string;
};

export type UpdateStatusInput = Partial<{ name: string; color: string; icon: string; isActive: boolean }>;

export const statusRepository = {
  async findAllForModule(companyId: string, module: StatusModule, includeInactive = true): Promise<StatusRow[]> {
    const existing = await Status.countDocuments({ companyId, module, deletedAt: { $exists: false } });
    if (existing === 0) await seedDefaults(companyId, module);

    const query: Record<string, unknown> = { companyId, module, deletedAt: { $exists: false } };
    if (!includeInactive) query.isActive = true;

    const rows = await Status.find(query).sort({ order: 1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findById(companyId: string, id: string): Promise<StatusRow | null> {
    const row = await Status.findOne({ _id: id, companyId, deletedAt: { $exists: false } }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async findByKey(companyId: string, module: StatusModule, key: string): Promise<StatusRow | null> {
    const row = await Status.findOne({ companyId, module, key, deletedAt: { $exists: false } }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async existsByNameOrKey(companyId: string, module: StatusModule, name: string, key: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = {
      companyId,
      module,
      deletedAt: { $exists: false },
      $or: [{ name: { $regex: `^${name.trim()}$`, $options: "i" } }, { key }],
    };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await Status.countDocuments(query);
    return count > 0;
  },
  async create(input: CreateStatusInput): Promise<StatusRow> {
    const maxOrderRow = await Status.findOne({ companyId: input.companyId, module: input.module })
      .sort({ order: -1 })
      .select("order")
      .lean<{ order: number } | null>();
    const doc = await Status.create({
      ...input,
      order: (maxOrderRow?.order ?? -1) + 1,
      isActive: true,
      isDefault: false,
    });
    return serialize(doc.toObject());
  },
  async update(companyId: string, id: string, input: UpdateStatusInput): Promise<StatusRow | null> {
    const row = await Status.findOneAndUpdate({ _id: id, companyId }, input, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async softDelete(companyId: string, id: string): Promise<void> {
    await Status.updateOne({ _id: id, companyId }, { deletedAt: new Date(), isActive: false });
  },
  async reorder(companyId: string, module: StatusModule, orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) => Status.updateOne({ _id: id, companyId, module }, { order: index })),
    );
  },
};
