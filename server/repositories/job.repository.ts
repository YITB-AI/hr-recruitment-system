import { Job } from "@/models";

// createdAt is stored as an ISO string (n8n's convention), not a BSON date,
// so range queries convert it via $expr/$toDate rather than comparing
// directly against Date instances.
export const jobRepository = {
  countTotal() {
    return Job.countDocuments({});
  },
  countCreatedBetween(start: Date, end: Date) {
    return Job.countDocuments({
      $expr: {
        $and: [
          { $gte: [{ $toDate: "$createdAt" }, start] },
          { $lt: [{ $toDate: "$createdAt" }, end] },
        ],
      },
    });
  },
  async findAll(): Promise<Array<{ _id: string; title: string }>> {
    const rows = await Job.find().select("_id title").lean<Array<{ _id: unknown; title: string }>>();
    return rows.map((row) => ({ _id: String(row._id), title: row.title }));
  },
  /** Rows the external n8n pipeline wrote with no companyId — see the comment on Job.companyId. */
  async findUnmapped(): Promise<Array<{ _id: string; job_id: string; title: string; department: string; city: string; country: string }>> {
    const rows = await Job.find({ companyId: { $exists: false } })
      .select("job_id title department city country")
      .lean<Array<Record<string, unknown> & { _id: unknown }>>();
    return rows.map((row) => ({
      _id: String(row._id),
      job_id: row.job_id as string,
      title: row.title as string,
      department: (row.department as string) || "",
      city: (row.city as string) || "",
      country: (row.country as string) || "",
    }));
  },
  async assignCompany(jobId: string, companyId: string): Promise<void> {
    await Job.updateOne({ _id: jobId }, { companyId });
  },
};
