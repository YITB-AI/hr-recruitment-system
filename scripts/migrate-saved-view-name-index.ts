import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { connectDB } from "@/server/db/connect";
import { SavedView } from "@/models/SavedView";

// Replaces the old global-unique `name` index on SavedView with the
// compound `{companyId, name}` unique index models/SavedView.ts now
// declares — two companies can legitimately both name a view "Shortlisted".
// Mirrors scripts/migrate-user-email-index.ts's exact pattern. Dry-run by
// default; pass --confirm to write. Idempotent. Never invoked automatically.

const NEW_INDEX_KEY = { companyId: 1, name: 1 };

async function main() {
  const confirm = process.argv.includes("--confirm");
  await connectDB();

  console.log(`\n=== SavedView name index migration ${confirm ? "(LIVE RUN)" : "(DRY RUN — pass --confirm to write)"} ===\n`);

  const missingCompanyId = await SavedView.countDocuments({ companyId: { $exists: false } });
  console.log(`SavedView rows missing companyId: ${missingCompanyId}`);
  if (missingCompanyId > 0) {
    console.log("NOT SAFE to proceed — these rows need a companyId backfill first (see scripts/migrate-tenancy.ts).");
    process.exit(1);
  }

  const indexes = await SavedView.collection.indexes();
  console.log("\nCurrent indexes on `savedviews`:");
  for (const idx of indexes) {
    console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (unique)" : ""}`);
  }

  const oldIndex = indexes.find((idx) => idx.unique && JSON.stringify(idx.key) === JSON.stringify({ name: 1 }));
  const newIndexExists = indexes.some((idx) => idx.unique && JSON.stringify(idx.key) === JSON.stringify(NEW_INDEX_KEY));

  const duplicates = await SavedView.aggregate([
    { $group: { _id: { companyId: "$companyId", name: "$name" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  console.log(`\nWithin-company name duplicates found: ${duplicates.length}`);
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
      ` and ${newIndexExists ? "skip creating the compound index (already exists)" : "create a new unique index on {companyId: 1, name: 1}"}.`,
  );

  if (!confirm) {
    console.log("\nDry run only — no changes written. Re-run with --confirm to apply.\n");
    process.exit(0);
  }

  if (oldIndex?.name) {
    await SavedView.collection.dropIndex(oldIndex.name);
    console.log(`Dropped old index "${oldIndex.name}".`);
  }
  if (!newIndexExists) {
    await SavedView.collection.createIndex(NEW_INDEX_KEY, { unique: true });
    console.log("Created new unique index on {companyId: 1, name: 1}.");
  }

  console.log("\n=== Migration committed successfully ===\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
