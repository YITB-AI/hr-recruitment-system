import type { ApplicantStatus } from "@/constants/applicant-status";
import type { TemplateMilestoneType } from "@/constants/document-template";

export type TrendDirection = "up" | "down" | "flat";

export type StatTrend = {
  direction: TrendDirection;
  percentage: number;
};

export type DashboardStat = {
  label: string;
  value: number;
  trend: StatTrend;
};

export type DashboardStats = {
  totalJobs: DashboardStat;
  totalApplicants: DashboardStat;
  shortlisted: DashboardStat;
  hired: DashboardStat;
};

export type ApplicantStatusSlice = {
  status: ApplicantStatus;
  label: string;
  count: number;
  percentage: number;
  colorVar: string;
};

export type ActivityFeedItem = {
  id: string;
  message: string;
  actorName: string | null;
  createdAt: string;
};

export type UpcomingInterview = {
  id: string;
  applicantName: string;
  jobTitle: string;
  scheduledAt: string;
};

export type CommunicationStats = {
  calls: number;
  emails: number;
  messages: number;
  pending: number;
  failed: number;
  inProgress: number;
};

export type NextActionItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

export type UpcomingEmployeeActionItem = {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  action: string;
  milestoneType: TemplateMilestoneType;
  // Resolved template tagged for this milestone, if any — see
  // findTemplateForMilestone in document-template.service.ts. Null when no
  // template has been tagged yet for this milestone type.
  templateId: string | null;
  dueDate: string;
};

export type DashboardData = {
  stats: DashboardStats;
  applicantsByStatus: ApplicantStatusSlice[];
  recentActivity: ActivityFeedItem[];
  upcomingInterviews: UpcomingInterview[];
  communication: CommunicationStats;
  nextActions: NextActionItem[];
  upcomingEmployeeActions: {
    today: UpcomingEmployeeActionItem[];
    upcoming: UpcomingEmployeeActionItem[];
  };
};
