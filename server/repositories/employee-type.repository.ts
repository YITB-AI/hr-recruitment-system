import { EmployeeType } from "@/models";

export type EmployeeTypeRow = {
  _id: string;
  name: string;
  parentTypeId: string | null;
  isActive: boolean;
  order: number;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): EmployeeTypeRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    parentTypeId: row.parentTypeId ? String(row.parentTypeId) : null,
    isActive: Boolean(row.isActive),
    order: row.order as number,
  };
}

export type CreateEmployeeTypeInput = {
  companyId: string;
  name: string;
  parentTypeId?: string;
  createdBy?: string;
};

export type UpdateEmployeeTypeInput = Partial<{ name: string; parentTypeId: string | null; isActive: boolean }>;

export const employeeTypeRepository = {
  async findAll(companyId: string, includeInactive = true): Promise<EmployeeTypeRow[]> {
    const query: Record<string, unknown> = { companyId, deletedAt: { $exists: false } };
    if (!includeInactive) query.isActive = true;
    const rows = await EmployeeType.find(query).sort({ order: 1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findById(companyId: string, id: string): Promise<EmployeeTypeRow | null> {
    const row = await EmployeeType.findOne({ _id: id, companyId, deletedAt: { $exists: false } }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async existsByName(companyId: string, name: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = {
      companyId,
      deletedAt: { $exists: false },
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await EmployeeType.countDocuments(query);
    return count > 0;
  },
  // Walks up the proposed parent's ancestor chain looking for `id` — used
  // to reject a create/update that would introduce a cycle (a type
  // reporting to its own descendant). Depth-capped so corrupted data (an
  // existing cycle from a bug) can't spin this into an infinite loop.
  async wouldCreateCycle(companyId: string, id: string, proposedParentId: string): Promise<boolean> {
    let currentId: string | null = proposedParentId;
    for (let depth = 0; depth < 50 && currentId; depth++) {
      if (currentId === id) return true;
      const parentRow: { parentTypeId?: unknown } | null = await EmployeeType.findOne({ _id: currentId, companyId })
        .select("parentTypeId")
        .lean();
      currentId = parentRow?.parentTypeId ? String(parentRow.parentTypeId) : null;
    }
    return false;
  },
  async create(input: CreateEmployeeTypeInput): Promise<EmployeeTypeRow> {
    const maxOrderRow = await EmployeeType.findOne({ companyId: input.companyId })
      .sort({ order: -1 })
      .select("order")
      .lean<{ order: number } | null>();
    const doc = await EmployeeType.create({
      ...input,
      order: (maxOrderRow?.order ?? -1) + 1,
      isActive: true,
    });
    return serialize(doc.toObject());
  },
  async update(companyId: string, id: string, input: UpdateEmployeeTypeInput): Promise<EmployeeTypeRow | null> {
    const { parentTypeId, ...rest } = input;
    const update: Record<string, unknown> = {};
    const setFields: Record<string, unknown> = { ...rest };
    if (parentTypeId === null) {
      update.$unset = { parentTypeId: "" };
    } else if (parentTypeId !== undefined) {
      setFields.parentTypeId = parentTypeId;
    }
    if (Object.keys(setFields).length > 0) update.$set = setFields;

    const row = await EmployeeType.findOneAndUpdate({ _id: id, companyId }, update, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async softDelete(companyId: string, id: string): Promise<void> {
    await EmployeeType.updateOne({ _id: id, companyId }, { deletedAt: new Date(), isActive: false });
  },
  async reorder(companyId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(orderedIds.map((id, index) => EmployeeType.updateOne({ _id: id, companyId }, { order: index })));
  },
};
