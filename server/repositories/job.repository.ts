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
  findAll() {
    return Job.find().select("_id title").lean<Array<{ _id: string; title: string }>>();
  },
};
