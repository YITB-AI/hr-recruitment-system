import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { connectDB } from "@/server/db/connect";
import { User } from "@/models/User";

// Replaces the old global-unique `email` index on User with the compound
// `{companyId, email}` unique index models/User.ts now declares — the same
// email can legitimately exist at two different client companies. Dry-run
// by default; pass --confirm to write. Idempotent (skips if the new index
// already exists). Never invoked automatically; mutates a production index
// and must be run manually with the operator watching the output — same
// convention as scripts/migrate-tenancy.ts.

const NEW_INDEX_KEY = { companyId: 1, email: 1 };

async function main() {
  const confirm = process.argv.includes("--confirm");
  await connectDB();

  console.log(`\n=== User email index migration ${confirm ? "(LIVE RUN)" : "(DRY RUN — pass --confirm to write)"} ===\n`);

  const indexes = await User.collection.indexes();
  console.log("Current indexes on `users`:");
  for (const idx of indexes) {
    console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (unique)" : ""}`);
  }

  const oldIndex = indexes.find((idx) => idx.unique && JSON.stringify(idx.key) === JSON.stringify({ email: 1 }));
  const newIndexExists = indexes.some((idx) => idx.unique && JSON.stringify(idx.key) === JSON.stringify(NEW_INDEX_KEY));

  // Verify no within-company email duplicate would violate the new compound
  // unique index. Expected to always be zero — the OLD global-unique index
  // already guaranteed no two users anywhere share an email — but confirmed
  // directly rather than assumed before touching a live index.
  const duplicates = await User.aggregate([
    { $group: { _id: { companyId: "$companyId", email: "$email" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  console.log(`\nWithin-company email duplicates found: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log("NOT SAFE to proceed — resolve these duplicates first:");
    console.log(JSON.stringify(duplicates, null, 2));
    process.exit(1);
  }

  if (newIndexExists) {
    console.log("\nCompound {companyId, email} unique index already exists. Nothing to do.");
    process.exit(0);
  }

  console.log(
    `\nWould ${oldIndex ? `drop old index "${oldIndex.name}"` : "skip dropping old index (none found)"} and create a new unique index on {companyId: 1, email: 1}.`,
  );

  if (!confirm) {
    console.log("\nDry run only — no changes written. Re-run with --confirm to apply.\n");
    process.exit(0);
  }

  if (oldIndex?.name) {
    await User.collection.dropIndex(oldIndex.name);
    console.log(`Dropped old index "${oldIndex.name}".`);
  }
  await User.collection.createIndex(NEW_INDEX_KEY, { unique: true });
  console.log("Created new unique index on {companyId: 1, email: 1}.");

  console.log("\n=== Migration committed successfully ===\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
