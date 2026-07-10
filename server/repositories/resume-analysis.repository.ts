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
