import { Types } from "mongoose";
import { ResumeAnalysis } from "@/models";

export type ResumeAnalysisRow = {
  _id: string;
  overallScore: number;
  jdMatchPercentage: number;
  strengths: string[];
  missingSkills: string[];
  weaknesses: string[];
  summary: string | null;
  recommendation: string | null;
};

type RawRow = {
  _id: unknown;
  overallScore: number;
  jdMatchPercentage: number;
  strengths: string[];
  missingSkills: string[];
  weaknesses: string[];
  summary?: string;
  recommendation?: string;
};

// NOT companyId-scoped here, unlike other repositories — like Job, this
// collection is written directly by the external n8n pipeline, which may
// not stamp companyId reliably (see the comment on Job's companyId field).
// Isolation is enforced one level up instead: callers must first resolve
// the applicant via applicantRepository.findById(companyId, applicantId)
// (which IS scoped) and only call this if that lookup succeeded — see
// getApplicantResumeAnalysis in applicant.service.ts.
export const resumeAnalysisRepository = {
  async findByApplicantId(applicantId: string): Promise<ResumeAnalysisRow | null> {
    const row = await ResumeAnalysis.findOne({ applicantId })
      .sort({ createdAt: -1 })
      .select("overallScore jdMatchPercentage strengths missingSkills weaknesses summary recommendation")
      .lean<RawRow | null>();

    if (!row) return null;

    return {
      _id: String(row._id),
      overallScore: row.overallScore,
      jdMatchPercentage: row.jdMatchPercentage,
      strengths: row.strengths,
      missingSkills: row.missingSkills,
      weaknesses: row.weaknesses,
      summary: row.summary ?? null,
      recommendation: row.recommendation ?? null,
    };
  },

  // --- Orphaned-record repair (features/settings/services/data-repair.service.ts) ---
  // Same class of bug as applicantRepository's orphaned-record handling: a
  // raw external write (n8n's own MongoDB node) can leave companyId/
  // applicantId/jobId as plain strings instead of ObjectIds, and
  // createdAt/updatedAt entirely missing instead of set by Mongoose's
  // timestamps option — either way, findByApplicantId's ObjectId-cast query
  // above never matches, so the applicant silently shows no score at all.
  async findOrphaned(): Promise<Array<Record<string, unknown> & { _id: unknown }>> {
    return ResumeAnalysis.find({
      $or: [
        { companyId: { $type: "string" } },
        { applicantId: { $type: "string" } },
        { jobId: { $type: "string" } },
        { createdAt: { $exists: false } },
        { createdAt: { $type: "string" } },
        { updatedAt: { $exists: false } },
        { updatedAt: { $type: "string" } },
      ],
    }).lean();
  },
  // Raw driver, not Model.updateOne() — see the identical comment on
  // applicantRepository.repairTypes: Mongoose's timestamps option marks
  // createdAt immutable, which silently blocks fixing it through any
  // Mongoose-level update method.
  async repairTypes(
    id: string,
    fix: { companyId: Types.ObjectId; applicantId: Types.ObjectId; jobId: Types.ObjectId; createdAt: Date; updatedAt: Date },
  ): Promise<void> {
    await ResumeAnalysis.collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: fix });
  },
};
