import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { connectDB } from "@/server/db/connect";
import { Company } from "@/models/Company";
import { Job } from "@/models/Job";
import { Applicant } from "@/models/Applicant";
import { Interview } from "@/models/Interview";
import { ResumeAnalysis } from "@/models/ResumeAnalysis";
import { EmailLog } from "@/models/EmailLog";
import { ApplicantFollowup } from "@/models/ApplicantFollowup";
import { ActivityLog } from "@/models/ActivityLog";

// Creates ONE fully-populated demo applicant (with a linked job, interview,
// AI analysis, email log, follow-up log, and activity history) for use as a
// stable target when wiring up/testing n8n workflows against this app.
//
// Populates every field that actually exists on these models today. Fields
// the checklist also asked for that this app has no real data model for yet
// (structured Experience/Education/Languages/Projects/Certifications, and a
// Notes feature) are NOT faked here — those tabs are still explicit
// placeholders (see app/(app)/applicants/[id]/page.tsx's PLACEHOLDER_TABS)
// and adding fake data for a feature that doesn't exist yet would be
// misleading rather than useful for testing.
//
// Usage:
//   npm run create:demo-applicant -- --company-slug acme

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return { companySlug: get("--company-slug") };
}

async function main() {
  const { companySlug } = parseArgs();
  if (!companySlug) {
    console.error("Usage: npm run create:demo-applicant -- --company-slug <slug>");
    process.exit(1);
  }

  await connectDB();

  const company = await Company.findOne({ slug: companySlug.toLowerCase().trim() });
  if (!company) {
    console.error(`No company found with slug "${companySlug}".`);
    process.exit(1);
  }

  const suffix = Date.now();
  const job = await Job.create({
    job_id: `demo-job-${suffix}`,
    title: "Senior Product Designer (Demo)",
    companyId: company._id,
    department: "Design",
    city: "Austin",
    state: "TX",
    country: "USA",
    status: "Open",
    type: "Full-time",
    description: "Demo job created for n8n workflow testing — safe to delete.",
  });

  const applicant = await Applicant.create({
    companyId: company._id,
    name: "Jordan Ellis (Demo)",
    email: `jordan.ellis.demo+${suffix}@example.com`,
    phone: "+1-512-555-0142",
    jobId: job._id,
    status: "interview",
    source: "linkedin",
    location: "Austin, TX",
    resumeUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    linkedinUrl: "https://www.linkedin.com/in/jordan-ellis-demo",
    githubUrl: "https://github.com/jordan-ellis-demo",
    portfolioUrl: "https://jordanellis-demo.example.com",
    skills: ["Figma", "Design Systems", "User Research", "Prototyping", "Accessibility"],
    experienceYears: 6,
    currentPosition: "Senior Product Designer at Acme Corp",
    tags: ["demo", "n8n-test"],
  });

  const interview = await Interview.create({
    companyId: company._id,
    applicantId: applicant._id,
    jobId: job._id,
    type: "final",
    status: "scheduled",
    scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    durationMinutes: 45,
    meetingLink: "https://meet.example.com/demo-interview",
    notes: "Demo interview — safe to delete.",
  });

  await ResumeAnalysis.create({
    companyId: company._id,
    applicantId: applicant._id,
    jobId: job._id,
    overallScore: 87,
    jdMatchPercentage: 82,
    strengths: ["Strong portfolio of shipped design systems", "6 years of relevant product design experience"],
    missingSkills: ["No direct experience with motion design"],
    weaknesses: ["Limited experience leading a design team"],
    summary: "A strong match for a senior IC design role with room to grow into design leadership.",
    recommendation: "Proceed to final interview.",
  });

  await EmailLog.create({
    companyId: company._id,
    applicantId: applicant._id,
    interviewId: interview._id,
    to: applicant.email,
    subject: "Interview scheduled: Senior Product Designer (Demo)",
    template: "interview_invite",
    status: "sent",
    userName: "Demo Setup Script",
    response: "queued",
  });

  await ApplicantFollowup.create({
    companyId: company._id,
    applicantId: applicant._id,
    type: "call",
    source: "ai-call",
    status: "pending",
    message: "Confirm availability for the final interview and answer any questions about the role.",
    requestedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdByName: "Demo Setup Script",
  });

  await ActivityLog.insertMany([
    {
      companyId: company._id,
      actorName: "Demo Setup Script",
      action: "applicant.new",
      entityType: "applicant",
      entityId: applicant._id,
      message: `${applicant.name}'s status changed to New for ${job.title}`,
    },
    {
      companyId: company._id,
      actorName: "Demo Setup Script",
      action: "applicant.shortlisted",
      entityType: "applicant",
      entityId: applicant._id,
      message: `${applicant.name}'s status changed to Shortlisted for ${job.title}`,
    },
    {
      companyId: company._id,
      actorName: "Demo Setup Script",
      action: "interview.scheduled",
      entityType: "interview",
      entityId: interview._id,
      message: `Interview scheduled for ${applicant.name} — ${job.title}`,
    },
  ]);

  console.log("\n=== Demo applicant created ===");
  console.log(`Company:      ${company.name}`);
  console.log(`Job:          ${job.title}  (job_id: ${job.job_id})`);
  console.log(`Applicant:    ${applicant.name}`);
  console.log(`Applicant ID: ${applicant._id}`);
  console.log(`Email:        ${applicant.email}`);
  console.log(`\nView it at /applicants/${applicant._id} once logged in.`);
  console.log("Everything created by this script (job/applicant/interview/analysis/logs) is tagged as a demo — delete manually when done testing.\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create demo applicant:", err);
  process.exit(1);
});
