import { SavedView } from "@/models";

export type SavedViewRow = {
  _id: string;
  name: string;
  filters: Record<string, string>;
  createdByName: string | null;
};

type RawRow = Record<string, unknown> & { _id: unknown; filters: Map<string, string> | Record<string, string> };

function serialize(row: RawRow): SavedViewRow {
  const filters = row.filters instanceof Map ? Object.fromEntries(row.filters) : row.filters;
  return {
    _id: String(row._id),
    name: row.name as string,
    filters,
    createdByName: (row.createdByName as string | undefined) ?? null,
  };
}

export type CreateSavedViewInput = {
  name: string;
  filters: Record<string, string>;
  createdByName?: string;
};

export const savedViewRepository = {
  async findAll(): Promise<SavedViewRow[]> {
    const rows = await SavedView.find().sort({ name: 1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async create(input: CreateSavedViewInput): Promise<SavedViewRow> {
    const doc = await SavedView.create(input);
    return serialize(doc.toObject());
  },
  async delete(id: string): Promise<void> {
    await SavedView.findByIdAndDelete(id);
  },
};
