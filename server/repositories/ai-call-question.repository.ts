import { AiCallQuestion } from "@/models";

export type AiCallQuestionRow = {
  _id: string;
  text: string;
  isActive: boolean;
  order: number;
};

type RawRow = Record<string, unknown> & { _id: unknown };

function serialize(row: RawRow): AiCallQuestionRow {
  return {
    _id: String(row._id),
    text: row.text as string,
    isActive: Boolean(row.isActive),
    order: row.order as number,
  };
}

export type CreateAiCallQuestionInput = {
  companyId: string;
  text: string;
  createdBy?: string;
};

export type UpdateAiCallQuestionInput = Partial<{ text: string; isActive: boolean }>;

export const aiCallQuestionRepository = {
  async findAll(companyId: string, includeInactive = true): Promise<AiCallQuestionRow[]> {
    const query: Record<string, unknown> = { companyId };
    if (!includeInactive) query.isActive = true;
    const rows = await AiCallQuestion.find(query).sort({ order: 1 }).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async findById(companyId: string, id: string): Promise<AiCallQuestionRow | null> {
    const row = await AiCallQuestion.findOne({ _id: id, companyId }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  // The enabled, ordered question set threaded into the outbound ai-call
  // webhook payload — see ai-call.service.ts.
  async findActiveOrdered(companyId: string): Promise<{ text: string }[]> {
    const rows = await AiCallQuestion.find({ companyId, isActive: true })
      .sort({ order: 1 })
      .select("text")
      .lean<Array<{ text: string }>>();
    return rows.map((row) => ({ text: row.text }));
  },
  async create(input: CreateAiCallQuestionInput): Promise<AiCallQuestionRow> {
    const maxOrderRow = await AiCallQuestion.findOne({ companyId: input.companyId })
      .sort({ order: -1 })
      .select("order")
      .lean<{ order: number } | null>();
    const doc = await AiCallQuestion.create({
      ...input,
      order: (maxOrderRow?.order ?? -1) + 1,
      isActive: true,
    });
    return serialize(doc.toObject());
  },
  async update(companyId: string, id: string, input: UpdateAiCallQuestionInput): Promise<AiCallQuestionRow | null> {
    const row = await AiCallQuestion.findOneAndUpdate({ _id: id, companyId }, input, { returnDocument: "after" }).lean<RawRow | null>();
    return row ? serialize(row) : null;
  },
  async delete(companyId: string, id: string): Promise<void> {
    await AiCallQuestion.deleteOne({ _id: id, companyId });
  },
  async reorder(companyId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(orderedIds.map((id, index) => AiCallQuestion.updateOne({ _id: id, companyId }, { order: index })));
  },
};
