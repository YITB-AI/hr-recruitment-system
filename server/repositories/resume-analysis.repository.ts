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
};
