// Client-safe: no Mongoose/model imports here.

/**
 * The Global Super Admin's "Model Access" registry — every module/capability
 * a company can be granted at creation time (or later, from its detail
 * page). Each key maps to a genuinely real feature in this codebase (no
 * placeholders) — see the `route`/`webhookAction` hints below for where each
 * one actually lives.
 *
 * `isCore: true` features are bundled into every company (the base HR/ATS
 * product) and render as checked+locked in the wizard — they're not part of
 * the per-company toggle decision, just shown for transparency. Everything
 * else is a real opt-in/opt-out a Global Super Admin can flip.
 *
 * `Company.enabledFeatures` stores only the *non-core* keys a company has
 * turned on. An empty/missing array is treated as "every feature enabled" —
 * see the comment on `Company.enabledFeatures` — so existing companies
 * created before this registry existed are never accidentally locked out of
 * anything.
 */
export type CompanyFeatureKey =
  | "employees"
  | "applicants"
  | "jobs"
  | "interviews"
  | "documents"
  | "notifications"
  | "aiResumeAnalysis"
  | "aiScreeningCalls"
  | "jobAutoSync"
  | "calendarIntegration"
  | "n8nAutomations"
  | "emailNotifications"
  | "smsNotifications"
  | "socialJobPosting"
  | "indeedJobFeed"
  | "bulkEmployeeImport"
  | "hrRequirementsMatching";

export type CompanyFeatureGroupKey = "core" | "aiAutomation" | "integrationsAccess";

export type CompanyFeatureDefinition = {
  key: CompanyFeatureKey;
  label: string;
  description: string;
  isCore: boolean;
};

export type CompanyFeatureGroup = {
  key: CompanyFeatureGroupKey;
  label: string;
  description: string;
  features: CompanyFeatureDefinition[];
};

export const COMPANY_FEATURE_GROUPS: CompanyFeatureGroup[] = [
  {
    key: "core",
    label: "Core Modules",
    description: "The base HR/ATS product — included with every company.",
    features: [
      { key: "employees", label: "Employee Management", description: "Employee records, master data, documents, and lifecycle tracking.", isCore: true },
      { key: "applicants", label: "Applicant Tracking (ATS)", description: "Applicant pipeline, statuses, notes, and communication history.", isCore: true },
      { key: "jobs", label: "Job Postings", description: "Create and manage open job requisitions.", isCore: true },
      { key: "interviews", label: "Interview Scheduling", description: "Schedule, reschedule, and track interviews.", isCore: true },
      { key: "documents", label: "Document Generation", description: "Templates, letterheads, and generated document history.", isCore: true },
      { key: "notifications", label: "Notifications", description: "In-app notifications for staff across every module.", isCore: true },
    ],
  },
  {
    key: "aiAutomation",
    label: "AI & Automation",
    description: "AI-assisted screening and workflow automation, delegated to n8n where noted.",
    features: [
      { key: "aiResumeAnalysis", label: "AI Resume Analysis", description: "Automated resume scoring and HR-requirements matching for applicants.", isCore: false },
      { key: "aiScreeningCalls", label: "AI Screening Calls", description: "Outbound AI voice screening calls (n8n/ElevenLabs-delegated) with outcome tracking.", isCore: false },
      { key: "jobAutoSync", label: "Job Auto-Sync", description: "Automatic job import/sync from the company's own n8n workflow.", isCore: false },
      { key: "hrRequirementsMatching", label: "HR Requirements Matching", description: "Per-job HR requirement checklists surfaced against AI resume analysis.", isCore: false },
    ],
  },
  {
    key: "integrationsAccess",
    label: "Integrations & Access",
    description: "External connections and distribution channels — n8n configuration is completed by Admins after setup.",
    features: [
      { key: "n8nAutomations", label: "n8n Automations & Webhooks", description: "Per-company webhook URLs, auth headers, and workflow configuration.", isCore: false },
      { key: "emailNotifications", label: "Email Notifications", description: "Outbound applicant/employee email via the configured sender.", isCore: false },
      { key: "smsNotifications", label: "SMS Notifications", description: "Outbound applicant SMS notifications.", isCore: false },
      { key: "calendarIntegration", label: "Calendar Integration", description: "Google Calendar / Outlook connection for interview scheduling conflict checks.", isCore: false },
      { key: "socialJobPosting", label: "Social Job Posting", description: "Publish job openings to Facebook/X and share to LinkedIn.", isCore: false },
      { key: "indeedJobFeed", label: "Job Board Feed (Indeed)", description: "Public XML job feed for organic Indeed listing.", isCore: false },
      { key: "bulkEmployeeImport", label: "Bulk Employee Import", description: "Spreadsheet-based bulk employee onboarding.", isCore: false },
    ],
  },
];

export const ALL_COMPANY_FEATURE_KEYS: CompanyFeatureKey[] = COMPANY_FEATURE_GROUPS.flatMap((g) =>
  g.features.map((f) => f.key),
);

export const CORE_COMPANY_FEATURE_KEYS: CompanyFeatureKey[] = COMPANY_FEATURE_GROUPS.flatMap((g) =>
  g.features.filter((f) => f.isCore).map((f) => f.key),
);

/** Non-core keys enabled by default for a newly created company, absent explicit choices. */
export const DEFAULT_ENABLED_COMPANY_FEATURES: CompanyFeatureKey[] = [
  "aiResumeAnalysis",
  "emailNotifications",
  "smsNotifications",
];

export function isValidCompanyFeatureKey(value: string): value is CompanyFeatureKey {
  return (ALL_COMPANY_FEATURE_KEYS as string[]).includes(value);
}
