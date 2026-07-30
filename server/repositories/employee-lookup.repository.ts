import type { Model } from "mongoose";
import { Group, Region, Station, CostCenter, Vendor, RoleTemplate, PayrollSetup, Area } from "@/models";
import { escapeRegex } from "@/lib/regex";
import { EMPLOYEE_LOOKUP_KINDS, type EmployeeLookupKind } from "@/constants/employee-lookup";

// A minimal structural type capturing only the Model methods this repository
// actually calls — lets 8 differently-typed Mongoose models (Group, Region,
// ...) share one implementation. Unlike scripts/migrate-tenancy.ts's
// `countDocuments | updateMany`-only pick (which TypeScript accepts
// bivariantly across differently-shaped models), `updateOne`/
// `findOneAndUpdate`'s chainable Query builders return each model's exact
// document shape, which isn't bivariantly compatible with a generic
// `Record<string, unknown>` document — so each concrete Model is cast once,
// here, at the single point where 8 real models are collapsed into one
// narrower interface. Every call site below is still fully type-checked
// against that narrower `LookupModel` interface.
type LookupModel = Pick<Model<Record<string, unknown>>, "find" | "findOne" | "findOneAndUpdate" | "countDocuments" | "create" | "updateOne">;

const MODELS: Record<EmployeeLookupKind, LookupModel> = {
  group: Group as unknown as LookupModel,
  region: Region as unknown as LookupModel,
  station: Station as unknown as LookupModel,
  cost_center: CostCenter as unknown as LookupModel,
  vendor: Vendor as unknown as LookupModel,
  role_template: RoleTemplate as unknown as LookupModel,
  payroll_setup: PayrollSetup as unknown as LookupModel,
  area: Area as unknown as LookupModel,
};

function modelFor(kind: EmployeeLookupKind): LookupModel {
  return MODELS[kind];
}

export type EmployeeLookupRow = {
  _id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  order: number;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): EmployeeLookupRow {
  return {
    _id: String(row._id),
    name: row.name as string,
    code: (row.code as string | undefined) ?? null,
    isActive: Boolean(row.isActive),
    order: row.order as number,
  };
}

export type CreateEmployeeLookupInput = {
  companyId: string;
  name: string;
  code?: string;
  createdBy?: string;
};

export type UpdateEmployeeLookupInput = Partial<{ name: string; code: string; isActive: boolean }>;

export const employeeLookupRepository = {
  async findAll(kind: EmployeeLookupKind, companyId: string, includeInactive = true): Promise<EmployeeLookupRow[]> {
    const query: Record<string, unknown> = { companyId, deletedAt: { $exists: false } };
    if (!includeInactive) query.isActive = true;
    const rows = await modelFor(kind).find(query).sort({ order: 1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  /** All 8 lists at once, keyed by kind — the shape the Settings panel renders from. */
  async findAllByKind(companyId: string, includeInactive = true): Promise<Record<EmployeeLookupKind, EmployeeLookupRow[]>> {
    const entries = await Promise.all(
      EMPLOYEE_LOOKUP_KINDS.map(async (kind) => [kind, await employeeLookupRepository.findAll(kind, companyId, includeInactive)] as const),
    );
    return Object.fromEntries(entries) as Record<EmployeeLookupKind, EmployeeLookupRow[]>;
  },
  async findById(kind: EmployeeLookupKind, companyId: string, id: string): Promise<EmployeeLookupRow | null> {
    const row = await modelFor(kind).findOne({ _id: id, companyId, deletedAt: { $exists: false } }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async existsByName(kind: EmployeeLookupKind, companyId: string, name: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = {
      companyId,
      deletedAt: { $exists: false },
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
    };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await modelFor(kind).countDocuments(query);
    return count > 0;
  },
  async create(kind: EmployeeLookupKind, input: CreateEmployeeLookupInput): Promise<EmployeeLookupRow> {
    const Model = modelFor(kind);
    const maxOrderRow = await Model.findOne({ companyId: input.companyId }).sort({ order: -1 }).select("order").lean<{ order: number } | null>();
    const doc = await Model.create({ ...input, order: (maxOrderRow?.order ?? -1) + 1, isActive: true });
    return serialize(doc.toObject() as RawRow);
  },
  async update(kind: EmployeeLookupKind, companyId: string, id: string, input: UpdateEmployeeLookupInput): Promise<EmployeeLookupRow | null> {
    const row = await modelFor(kind)
      .findOneAndUpdate({ _id: id, companyId }, input, { returnDocument: "after" })
      .lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async softDelete(kind: EmployeeLookupKind, companyId: string, id: string): Promise<void> {
    await modelFor(kind).updateOne({ _id: id, companyId }, { deletedAt: new Date(), isActive: false });
  },
  async reorder(kind: EmployeeLookupKind, companyId: string, orderedIds: string[]): Promise<void> {
    const Model = modelFor(kind);
    await Promise.all(orderedIds.map((id, index) => Model.updateOne({ _id: id, companyId }, { order: index })));
  },
};
