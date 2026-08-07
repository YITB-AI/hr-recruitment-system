import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { connectDB } from "@/server/db/connect";
import { Employee } from "@/models/Employee";

// Replaces the old global-unique `email` index on Employee with the compound
// `{companyId, email}` unique index models/Employee.ts now declares — the
// same email can legitimately belong to an employee at two different client
// companies. Mirrors scripts/migrate-user-email-index.ts's exact pattern.
// Dry-run by default; pass --confirm to write. Idempotent (skips if the new
// index already exists). Never invoked automatically; mutates a production
// index and must be run manually with the operator watching the output.

const NEW_INDEX_KEY = { companyId: 1, email: 1 };

async function main() {
  const confirm = process.argv.includes("--confirm");
  await connectDB();

  console.log(`\n=== Employee email index migration ${confirm ? "(LIVE RUN)" : "(DRY RUN — pass --confirm to write)"} ===\n`);

  // Employee.companyId was backfilled long ago by scripts/migrate-tenancy.ts,
  // but (unlike User) never got a dedicated follow-up making it schema-level
  // required — confirmed directly rather than assumed before flipping the
  // model to required:true and adding a compound index on it.
  const missingCompanyId = await Employee.countDocuments({ companyId: { $exists: false } });
  console.log(`Employee rows missing companyId: ${missingCompanyId}`);
  if (missingCompanyId > 0) {
    console.log("NOT SAFE to proceed — these rows need a companyId backfill first (see scripts/migrate-tenancy.ts).");
    process.exit(1);
  }

  const indexes = await Employee.collection.indexes();
  console.log("\nCurrent indexes on `employees`:");
  for (const idx of indexes) {
    console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (unique)" : ""}`);
  }

  const oldIndex = indexes.find((idx) => idx.unique && JSON.stringify(idx.key) === JSON.stringify({ email: 1 }));
  const newIndexExists = indexes.some((idx) => idx.unique && JSON.stringify(idx.key) === JSON.stringify(NEW_INDEX_KEY));

  // Verify no within-company email duplicate would violate the new compound
  // unique index. Expected to always be zero — the OLD global-unique index
  // already guaranteed no two employees anywhere share an email — but
  // confirmed directly rather than assumed before touching a live index.
  const duplicates = await Employee.aggregate([
    { $group: { _id: { companyId: "$companyId", email: "$email" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  console.log(`\nWithin-company email duplicates found: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log("NOT SAFE to proceed — resolve these duplicates first:");
    console.log(JSON.stringify(duplicates, null, 2));
    process.exit(1);
  }

  if (!oldIndex && newIndexExists) {
    console.log("\nOld global index already gone and compound index already exists. Nothing to do.");
    process.exit(0);
  }

  console.log(
    `\nWould ${oldIndex ? `drop old index "${oldIndex.name}"` : "skip dropping old index (none found)"}` +
      ` and ${newIndexExists ? "skip creating the compound index (already exists)" : "create a new unique index on {companyId: 1, email: 1}"}.`,
  );

  if (!confirm) {
    console.log("\nDry run only — no changes written. Re-run with --confirm to apply.\n");
    process.exit(0);
  }

  if (oldIndex?.name) {
    await Employee.collection.dropIndex(oldIndex.name);
    console.log(`Dropped old index "${oldIndex.name}".`);
  }
  if (!newIndexExists) {
    await Employee.collection.createIndex(NEW_INDEX_KEY, { unique: true });
    console.log("Created new unique index on {companyId: 1, email: 1}.");
  }

  console.log("\n=== Migration committed successfully ===\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
