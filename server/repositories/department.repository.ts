import { Department } from "@/models";

export type DepartmentRow = {
  _id: string;
  name: string;
  isActive: boolean;
  order: number;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): DepartmentRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    isActive: Boolean(row.isActive),
    order: row.order as number,
  };
}

export type CreateDepartmentInput = {
  companyId: string;
  name: string;
  createdBy?: string;
};

export type UpdateDepartmentInput = Partial<{ name: string; isActive: boolean }>;

export const departmentRepository = {
  async findAll(companyId: string, includeInactive = true): Promise<DepartmentRow[]> {
    const query: Record<string, unknown> = { companyId, deletedAt: { $exists: false } };
    if (!includeInactive) query.isActive = true;
    const rows = await Department.find(query).sort({ order: 1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findById(companyId: string, id: string): Promise<DepartmentRow | null> {
    const row = await Department.findOne({ _id: id, companyId, deletedAt: { $exists: false } }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async existsByName(companyId: string, name: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = {
      companyId,
      deletedAt: { $exists: false },
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await Department.countDocuments(query);
    return count > 0;
  },
  async create(input: CreateDepartmentInput): Promise<DepartmentRow> {
    const maxOrderRow = await Department.findOne({ companyId: input.companyId })
      .sort({ order: -1 })
      .select("order")
      .lean<{ order: number } | null>();
    const doc = await Department.create({
      ...input,
      order: (maxOrderRow?.order ?? -1) + 1,
      isActive: true,
    });
    return serialize(doc.toObject());
  },
  async update(companyId: string, id: string, input: UpdateDepartmentInput): Promise<DepartmentRow | null> {
    const row = await Department.findOneAndUpdate({ _id: id, companyId }, input, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async softDelete(companyId: string, id: string): Promise<void> {
    await Department.updateOne({ _id: id, companyId }, { deletedAt: new Date(), isActive: false });
  },
  async reorder(companyId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(orderedIds.map((id, index) => Department.updateOne({ _id: id, companyId }, { order: index })));
  },
};
