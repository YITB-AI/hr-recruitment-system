import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import mongoose, { type Model } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Company } from "@/models/Company";
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
import { SavedView } from "@/models/SavedView";

// Backfills `companyId` onto every existing document created before
// multi-tenancy existed, into one first Company row. Idempotent (skips any
// document that already has companyId) and dry-run by default — pass
// --confirm to actually write. Never invoked automatically by build/deploy;
// this mutates production data and must be run manually with the operator
// watching the output. Job is deliberately excluded from the backfill list —
// see the comment on companyId in models/Job.ts; its rows get a one-time
// manual admin mapping in a later phase instead.
const MODELS_TO_BACKFILL: Array<{ name: string; model: Model<any> }> = [
  { name: "User", model: User },
  { name: "Notification", model: Notification },
  { name: "Interview", model: Interview },
  { name: "Employee", model: Employee },
  { name: "Setting", model: Setting },
  { name: "ActivityLog", model: ActivityLog },
  { name: "GeneratedDocument", model: GeneratedDocument },
  { name: "ResumeAnalysis", model: ResumeAnalysis },
  { name: "SavedView", model: SavedView },
  { name: "Applicant", model: Applicant },
  { name: "DocumentTemplate", model: DocumentTemplate },
];

const MISSING_COMPANY_ID: Record<string, unknown> = { companyId: { $exists: false } };

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "default"
  );
}

async function resolveDefaultCompanyInput(): Promise<{ name: string; slug: string }> {
  const existingSetting = await Setting.findOne().lean<{ companyName?: string } | null>();
  const name = existingSetting?.companyName?.trim() || "Default Company";
  return { name, slug: slugify(name) };
}

async function main() {
  const confirm = process.argv.includes("--confirm");
  await connectDB();

  console.log(`\n=== Tenancy migration ${confirm ? "(LIVE RUN)" : "(DRY RUN — pass --confirm to write)"} ===\n`);

  const missingCounts: Array<{ name: string; missing: number; total: number }> = [];
  for (const { name, model } of MODELS_TO_BACKFILL) {
    const [missing, total] = await Promise.all([model.countDocuments(MISSING_COMPANY_ID), model.countDocuments()]);
    missingCounts.push({ name, missing, total });
    console.log(`${name}: ${missing}/${total} documents missing companyId`);
  }

  const jobsMissing = await Job.countDocuments(MISSING_COMPANY_ID);
  const jobsTotal = await Job.countDocuments();
  console.log(`Job: ${jobsMissing}/${jobsTotal} documents missing companyId (NOT backfilled by this script — see models/Job.ts)`);

  const totalToBackfill = missingCounts.reduce((sum, row) => sum + row.missing, 0);
  if (totalToBackfill === 0) {
    console.log("\nNothing to backfill — every row already has a companyId. Exiting.");
    process.exit(0);
  }

  const { name, slug } = await resolveDefaultCompanyInput();
  const existingCompany = await Company.findOne({ slug });
  console.log(
    `\nWould ${existingCompany ? "reuse existing" : "create"} company "${name}" (slug: "${slug}")` +
      ` and backfill ${totalToBackfill} document(s) across ${missingCounts.filter((r) => r.missing > 0).length} collection(s).`,
  );

  if (!confirm) {
    console.log("\nDry run only — no changes written. Re-run with --confirm to apply.\n");
    process.exit(0);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const company = existingCompany ?? (await Company.create([{ name, slug }], { session }))[0];
      console.log(`\nUsing company _id ${company._id}`);

      for (const { name: modelName, model } of MODELS_TO_BACKFILL) {
        const result = await model.updateMany(MISSING_COMPANY_ID, { companyId: company._id }, { session });
        console.log(`${modelName}: backfilled ${result.modifiedCount} document(s)`);
      }

      await ActivityLog.create(
        [
          {
            companyId: company._id,
            action: "migration.tenancy_backfill",
            entityType: "setting",
            entityId: company._id,
            message: `Tenancy migration backfilled ${totalToBackfill} document(s) into company "${name}"`,
          },
        ],
        { session },
      );
    });
    console.log("\n=== Migration committed successfully ===\n");
  } finally {
    await session.endSession();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
