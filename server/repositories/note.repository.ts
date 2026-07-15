import { Note } from "@/models";

export type NoteRow = {
  _id: string;
  applicantId: string;
  authorName: string;
  body: string;
  createdAt: Date;
};

type RawRow = Record<string, unknown> & { _id: unknown; applicantId: unknown };

function serialize(row: RawRow): NoteRow {
  return {
    _id: String(row._id),
    applicantId: String(row.applicantId),
    authorName: row.authorName as string,
    body: row.body as string,
    createdAt: row.createdAt as Date,
  };
}

export type CreateNoteInput = {
  companyId: string;
  applicantId: string;
  authorId?: string;
  authorName: string;
  body: string;
};

// Every function takes companyId first and filters by it — see the
// tenant-isolation comment in server/repositories/employee.repository.ts.
export const noteRepository = {
  async create(input: CreateNoteInput): Promise<NoteRow> {
    const doc = await Note.create(input);
    return serialize(doc.toObject());
  },
  async findByApplicantId(companyId: string, applicantId: string, limit = 50): Promise<NoteRow[]> {
    const rows = await Note.find({ companyId, applicantId }).sort({ createdAt: -1 }).limit(limit).lean<RawRow[]>();
    return rows.map(serialize);
  },
  async deleteById(companyId: string, id: string): Promise<boolean> {
    const result = await Note.deleteOne({ _id: id, companyId });
    return result.deletedCount > 0;
  },
};
