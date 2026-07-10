import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db/connect";
import { User } from "@/models/User";
import { Job } from "@/models/Job";
import { Applicant } from "@/models/Applicant";
import { Interview } from "@/models/Interview";
import { Employee } from "@/models/Employee";
import { ActivityLog } from "@/models/ActivityLog";
import { DocumentTemplate } from "@/models/DocumentTemplate";
import { GeneratedDocument } from "@/models/Document";
import { Notification } from "@/models/Notification";
import { Setting } from "@/models/Setting";
import { ResumeAnalysis } from "@/models/ResumeAnalysis";
import type { ApplicantStatus } from "@/constants/applicant-status";
import type { TemplateFieldInput } from "@/validators/document-template";
import { createTemplate } from "@/features/documents/services/document-template.service";
import { generateDocument } from "@/features/documents/services/generate-document.service";
import { createSimpleDocx } from "@/lib/docx";
import { rm } from "node:fs/promises";
import path from "node:path";

// This script never creates/deletes Job documents — jobs are owned by the
// existing n8n pipeline. It seeds every other collection the app owns,
// referencing whatever real job(s) already exist.

function daysAgo(days: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysFromNow(days: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length];
}

const FIRST_NAMES = [
  "Muhammad", "Fatima", "Usman", "Sana", "Bilal", "Areeba", "Ahsan", "Hina",
  "Zain", "Mahnoor", "Ali", "Ayesha", "Hamza", "Noor", "Saad", "Sara",
];
const LAST_NAMES = ["Ali", "Noor", "Khan", "Ahmed", "Hassan", "Malik", "Farooq", "Iqbal"];
const SOURCES = ["website", "linkedin", "referral", "job_board", "other"] as const;
const SKILL_POOL = ["React", "Node.js", "TypeScript", "Communication", "Project Management", "Figma", "SQL", "Problem Solving"];

const STATUS_PLAN: Array<{ status: ApplicantStatus; count: number }> = [
  { status: "new", count: 10 },
  { status: "screening", count: 8 },
  { status: "shortlisted", count: 6 },
  { status: "interview", count: 5 },
  { status: "offer", count: 2 },
  { status: "hired", count: 2 },
  { status: "rejected", count: 4 },
  { status: "incomplete", count: 3 },
];

type TemplateSeedDef = {
  name: string;
  category: string;
  description: string;
  paragraphs: string[];
  fields: TemplateFieldInput[];
};

const TEMPLATE_SEED_DEFS: TemplateSeedDef[] = [
  {
    name: "Standard Offer Letter",
    category: "Offer Letter",
    description: "Official offer letter for a selected candidate.",
    paragraphs: [
      "Dear {{employee_name}},",
      "We are pleased to offer you the position of {{job_title}}, starting on {{joining_date}}.",
      "Your basic salary will be Rs. {{basic_salary}} per month.",
    ],
    fields: [
      { key: "employee_name", label: "Employee Name", type: "text", required: true },
      { key: "job_title", label: "Job Title", type: "text", required: true },
      { key: "joining_date", label: "Joining Date", type: "date", required: true },
      { key: "basic_salary", label: "Basic Salary", type: "number", required: true },
    ],
  },
  {
    name: "Standard Appointment Letter",
    category: "Appointment Letter",
    description: "Official appointment confirmation letter.",
    paragraphs: [
      "Dear {{employee_name}},",
      "This confirms your appointment as {{designation}} in the {{department}} department, effective {{joining_date}}.",
    ],
    fields: [
      { key: "employee_name", label: "Employee Name", type: "text", required: true },
      { key: "designation", label: "Designation", type: "text", required: true },
      { key: "department", label: "Department", type: "text", required: true },
      { key: "joining_date", label: "Joining Date", type: "date", required: true },
    ],
  },
  {
    name: "Experience Letter",
    category: "Experience Letter",
    description: "Letter certifying an employee's work experience.",
    paragraphs: [
      "This is to certify that {{employee_name}} worked as {{designation}} from {{joining_date}} to {{last_working_date}}.",
    ],
    fields: [
      { key: "employee_name", label: "Employee Name", type: "text", required: true },
      { key: "designation", label: "Designation", type: "text", required: true },
      { key: "joining_date", label: "Joining Date", type: "date", required: true },
      { key: "last_working_date", label: "Last Working Date", type: "date", required: true },
    ],
  },
  {
    name: "Salary Certificate",
    category: "Salary Certificate",
    description: "Certificate confirming an employee's salary details.",
    paragraphs: [
      "This is to certify that {{employee_name}}, {{designation}}, draws a gross salary of Rs. {{gross_salary}} per month.",
    ],
    fields: [
      { key: "employee_name", label: "Employee Name", type: "text", required: true },
      { key: "designation", label: "Designation", type: "text", required: true },
      { key: "gross_salary", label: "Gross Salary", type: "number", required: true },
    ],
  },
  {
    name: "Annual Increment Letter",
    category: "Increment Letter",
    description: "Letter notifying an employee of a salary increment.",
    paragraphs: [
      "Dear {{employee_name}},",
      "We are pleased to inform you of an increment of Rs. {{increment_amount}} to your salary, effective {{effective_date}}.",
    ],
    fields: [
      { key: "employee_name", label: "Employee Name", type: "text", required: true },
      {
        key: "increment_amount",
        label: "Increment Amount",
        type: "calculated",
        required: true,
        calculation: { type: "percentage_of_basic", value: 10 },
      },
      { key: "effective_date", label: "Effective Date", type: "date", required: true },
    ],
  },
  {
    name: "Termination Letter — Misconduct",
    category: "Termination — Misconduct",
    description: "Termination letter for cases of employee misconduct.",
    paragraphs: [
      "Dear {{employee_name}},",
      "Your employment is terminated effective {{termination_date}} due to {{reason}}.",
    ],
    fields: [
      { key: "employee_name", label: "Employee Name", type: "text", required: true },
      { key: "termination_date", label: "Termination Date", type: "date", required: true },
      { key: "reason", label: "Reason", type: "text", required: true },
    ],
  },
];

async function seed() {
  await connectDB();

  const jobs = await Job.find().select("_id title").lean<Array<{ _id: unknown; title: string }>>();
  if (jobs.length === 0) {
    throw new Error(
      "No jobs found in the jobs collection. This seed script intentionally does not " +
        "create jobs (that collection belongs to the n8n pipeline) — create at least one " +
        "job first, then re-run.",
    );
  }
  console.log(`Found ${jobs.length} existing job(s) — everything below references these.`);

  console.log("Clearing previously-seeded data (jobs collection is untouched)...");
  await rm(path.join(process.cwd(), "storage", "templates"), { recursive: true, force: true });
  await rm(path.join(process.cwd(), "storage", "documents"), { recursive: true, force: true });
  await Promise.all([
    User.deleteMany({}),
    Applicant.deleteMany({}),
    Interview.deleteMany({}),
    Employee.deleteMany({}),
    ActivityLog.deleteMany({}),
    DocumentTemplate.deleteMany({}),
    GeneratedDocument.deleteMany({}),
    Notification.deleteMany({}),
    Setting.deleteMany({}),
    ResumeAnalysis.deleteMany({}),
  ]);

  console.log("Creating users...");
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  const [admin, hrManager, techLead, recruiter] = await User.create([
    { name: "Ahsan Ali", email: "ahsan.ali@example.com", passwordHash, role: "admin", title: "Super Admin" },
    { name: "Sarah Khan", email: "sarah.khan@example.com", passwordHash, role: "hr", title: "HR Manager" },
    { name: "Ali Raza", email: "ali.raza@example.com", passwordHash, role: "interviewer", title: "Tech Lead" },
    { name: "Bilal Ahmed", email: "bilal.ahmed@example.com", passwordHash, role: "recruiter", title: "Recruiter" },
  ]);

  console.log("Creating applicants...");
  let nameIndex = 0;
  const applicantDocs: Array<Record<string, unknown>> = [];

  for (const plan of STATUS_PLAN) {
    for (let i = 0; i < plan.count; i++) {
      const first = pick(FIRST_NAMES, nameIndex);
      const last = pick(LAST_NAMES, nameIndex + 3);
      const job = pick(jobs, nameIndex);
      const createdDaysAgo = Math.floor(Math.random() * 20);
      const updatedDaysAgo = Math.min(createdDaysAgo, Math.floor(Math.random() * 6));

      applicantDocs.push({
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${nameIndex}@example.com`,
        phone: "+92 300 1234567",
        jobId: job._id,
        status: plan.status,
        source: pick(SOURCES, nameIndex),
        location: "Lahore, Pakistan",
        skills: [pick(SKILL_POOL, nameIndex), pick(SKILL_POOL, nameIndex + 2), pick(SKILL_POOL, nameIndex + 4)],
        experienceYears: 1 + (nameIndex % 6),
        currentPosition: job.title,
        appliedAt: daysAgo(createdDaysAgo),
        createdAt: daysAgo(createdDaysAgo),
        updatedAt: daysAgo(updatedDaysAgo),
      });
      nameIndex += 1;
    }
  }

  const applicants = await Applicant.insertMany(applicantDocs, { timestamps: false });
  const byStatus = (status: ApplicantStatus) => applicants.filter((a) => a.status === status);

  console.log("Creating upcoming interviews...");
  const interviewCandidates = byStatus("interview");
  await Interview.insertMany(
    interviewCandidates.map((applicant, i) => ({
      applicantId: applicant._id,
      jobId: applicant.jobId,
      interviewerIds: [techLead._id, hrManager._id],
      type: i % 2 === 0 ? "technical" : "hr",
      status: "scheduled",
      scheduledAt: daysFromNow(i + 1, 10 + i),
      durationMinutes: 60,
      meetingLink: "https://meet.google.com/abc-defg-hij",
    })),
  );

  console.log("Creating resume analyses (shortlisted/interview/hired applicants)...");
  const analyzedApplicants = [...byStatus("shortlisted"), ...byStatus("interview"), ...byStatus("hired")];
  await ResumeAnalysis.insertMany(
    analyzedApplicants.map((applicant, i) => ({
      applicantId: applicant._id,
      jobId: applicant.jobId,
      overallScore: 65 + ((i * 7) % 35),
      jdMatchPercentage: 60 + ((i * 5) % 40),
      strengths: ["Strong communication skills", "Good problem solving", "Relevant project experience"],
      missingSkills: i % 2 === 0 ? ["AWS", "GraphQL"] : ["Leadership experience"],
      weaknesses: ["Limited experience with modern tools"],
      summary: `${applicant.name} shows a strong match for this role based on resume analysis.`,
      recommendation: "Proceed to interview stage.",
      createdAt: daysAgo(Math.floor(Math.random() * 10)),
    })),
  );

  console.log("Creating employees (from hired applicants + direct hires)...");
  const hiredApplicants = byStatus("hired");

  // A realistic department/status spread so the Employees page's tabs,
  // department filter, and pagination all have something to show.
  const MANUAL_EMPLOYEE_DEFS = [
    { name: "Fatima Sheikh", department: "Design", designation: "UI/UX Designer", status: "active", basic: 70000, gross: 95000 },
    { name: "Ahmed Raza", department: "Marketing", designation: "Marketing Specialist", status: "active", basic: 55000, gross: 75000 },
    { name: "Hina Tariq", department: "Finance", designation: "Accountant", status: "active", basic: 60000, gross: 82000 },
    { name: "Zainab Qureshi", department: "Development", designation: "Backend Developer", status: "active", basic: 85000, gross: 115000 },
    { name: "Omar Sheikh", department: "Development", designation: "Frontend Developer", status: "active", basic: 80000, gross: 108000 },
    { name: "Mahira Yousaf", department: "HR", designation: "HR Executive", status: "active", basic: 58000, gross: 78000 },
    { name: "Danish Iqbal", department: "Development", designation: "QA Engineer", status: "on_leave", basic: 62000, gross: 84000 },
    { name: "Sadia Anwar", department: "Design", designation: "Graphic Designer", status: "on_leave", basic: 50000, gross: 68000 },
    { name: "Waqas Malik", department: "Operations", designation: "Operations Manager", status: "active", basic: 95000, gross: 130000 },
    { name: "Rabia Saeed", department: "Marketing", designation: "Content Writer", status: "active", basic: 45000, gross: 60000 },
    { name: "Kamran Aziz", department: "Development", designation: "DevOps Engineer", status: "active", basic: 90000, gross: 122000 },
    { name: "Nadia Chaudhry", department: "Finance", designation: "Finance Manager", status: "terminated", basic: 100000, gross: 135000 },
    { name: "Tariq Mehmood", department: "HR", designation: "Recruiter", status: "terminated", basic: 52000, gross: 70000 },
  ] as const;

  const employeeDocs = [
    ...hiredApplicants.map((applicant, i) => ({
      applicantId: applicant._id,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      department: pick(jobs, i).title.includes("Assistant") ? "Operations" : "Engineering",
      designation: applicant.currentPosition ?? "Employee",
      joiningDate: daysAgo(5 + i),
      employmentType: "full_time" as const,
      employmentStatus: "active" as const,
      basicSalary: 60000 + i * 8000,
      grossSalary: 80000 + i * 10000,
    })),
    ...MANUAL_EMPLOYEE_DEFS.map((def, i) => ({
      name: def.name,
      email: `${def.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      phone: `+92 30${i} ${1000000 + i * 1111}`,
      department: def.department,
      designation: def.designation,
      joiningDate: daysAgo(15 + i * 7),
      employmentType: "full_time" as const,
      employmentStatus: def.status,
      basicSalary: def.basic,
      grossSalary: def.gross,
    })),
  ].map((doc, i) => ({ ...doc, employeeCode: `EMP-${1001 + i}` }));

  const employees = await Employee.insertMany(employeeDocs);

  console.log("Creating document templates (real .docx files on disk)...");
  const templates = await Promise.all(
    TEMPLATE_SEED_DEFS.map((def) =>
      createTemplate(
        { name: def.name, category: def.category, description: def.description, fields: def.fields },
        { buffer: createSimpleDocx(def.paragraphs), originalName: `${def.name.replace(/\s+/g, "_")}.docx` },
      ),
    ),
  );

  console.log("Generating real documents (offer + appointment letters) for the first 2 employees...");
  const offerTemplate = templates.find((t) => t.category === "Offer Letter")!;
  const appointmentTemplate = templates.find((t) => t.category === "Appointment Letter")!;

  for (const employee of employees.slice(0, 2)) {
    const joiningDate = employee.joiningDate.toISOString().slice(0, 10);

    await generateDocument(String(offerTemplate._id), String(employee._id), {
      employee_name: employee.name,
      job_title: employee.designation,
      joining_date: joiningDate,
      basic_salary: String(employee.basicSalary),
    });

    await generateDocument(String(appointmentTemplate._id), String(employee._id), {
      employee_name: employee.name,
      designation: employee.designation,
      department: employee.department,
      joining_date: joiningDate,
    });
  }

  console.log("Creating settings...");
  await Setting.create({
    companyName: "Digital Auxilius",
    timezone: "Asia/Karachi",
    dateFormat: "MMM D, YYYY",
    features: { aiResumeAnalysis: true, smsNotifications: true, emailNotifications: true },
  });

  console.log("Creating activity log...");
  await ActivityLog.insertMany([
    {
      actorId: recruiter._id,
      actorName: recruiter.name,
      action: "applicant.created",
      entityType: "applicant",
      entityId: applicants[0]._id,
      message: `New applicant received for ${jobs[0].title}`,
      createdAt: daysAgo(0, 8),
    },
    {
      actorId: hrManager._id,
      actorName: hrManager.name,
      action: "interview.scheduled",
      entityType: "interview",
      entityId: applicants[1]._id,
      message: `Interview scheduled for ${pick(jobs, 1).title}`,
      createdAt: daysAgo(0, 6),
    },
    {
      actorId: admin._id,
      actorName: admin.name,
      action: "applicant.hired",
      entityType: "applicant",
      entityId: applicants[3]._id,
      message: `${applicants[3].name} hired for ${pick(jobs, 2).title}`,
      createdAt: daysAgo(1, 11),
    },
    {
      actorId: hrManager._id,
      actorName: hrManager.name,
      action: "applicant.rejected",
      entityType: "applicant",
      entityId: applicants[4]._id,
      message: `${applicants[4].name} rejected for ${pick(jobs, 3).title}`,
      createdAt: daysAgo(2, 9),
    },
  ]);

  console.log("Creating notifications for the admin user...");
  await Notification.insertMany([
    {
      userId: admin._id,
      channel: "in_app",
      title: "New applicant",
      message: `${applicants[0].name} applied for ${jobs[0].title}`,
      read: false,
      createdAt: daysAgo(0, 8),
    },
    {
      userId: admin._id,
      channel: "in_app",
      title: "Interview scheduled",
      message: `Interview scheduled with ${interviewCandidates[0]?.name ?? "an applicant"}`,
      read: false,
      createdAt: daysAgo(0, 6),
    },
    {
      userId: admin._id,
      channel: "email",
      title: "Document generated",
      message: `Offer letter generated for ${applicants[2].name}`,
      read: true,
      createdAt: daysAgo(1, 15),
    },
  ]);

  console.log("Seed complete:");
  console.log(`  Users: 4`);
  console.log(`  Jobs referenced (untouched): ${jobs.length}`);
  console.log(`  Applicants: ${applicants.length}`);
  console.log(`  Interviews: ${interviewCandidates.length}`);
  console.log(`  Resume analyses: ${analyzedApplicants.length}`);
  console.log(`  Employees: ${employees.length}`);
  console.log(`  Document templates: ${templates.length}`);
  console.log(`  Notifications: 3`);
  console.log(`  Settings: 1`);
}

seed()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
