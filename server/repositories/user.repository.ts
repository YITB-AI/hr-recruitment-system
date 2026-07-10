import { User } from "@/models";

export type UserRow = { _id: string; name: string; title: string | null };

export const userRepository = {
  async findAll(): Promise<UserRow[]> {
    const rows = await User.find()
      .select("name title")
      .lean<Array<{ _id: unknown; name: string; title?: string }>>();
    return rows.map((row) => ({ _id: String(row._id), name: row.name, title: row.title ?? null }));
  },
};
