import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { connectDB } from "@/server/db/connect";
import { Employee } from "@/models/Employee";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Re-encrypts every Employee.basicSalary/grossSalary still stored as a
// plain BSON number (written before these fields became encrypted-at-rest
// — see models/Employee.ts and server/repositories/employee.repository.ts)
// into ciphertext, in place. Idempotent — a row already holding valid
// ciphertext is left untouched, safe to re-run. Dry-run by default; pass
// --confirm to actually write.
//
// This mutates real employee compensation data across every company —
// never run automatically as part of a deploy, and the --confirm run
// against production requires the same explicit operator sign-off as
// scripts/migrate-tenancy.ts.
//
// Uses the raw MongoDB driver (Employee.collection), not the Mongoose
// model, specifically to read a legacy row's real stored BSON number
// without any schema-based casting toward the new String type getting in
// the way — Mongoose's own .lean() reads would likely behave the same,
// but bypassing the ODM entirely here removes any doubt.
type RawEmployeeRow = { _id: unknown; basicSalary: unknown; grossSalary: unknown };

function isAlreadyEncrypted(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  try {
    decryptSecret(raw);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const confirm = process.argv.includes("--confirm");
  await connectDB();

  console.log(`\n=== Employee salary encryption migration ${confirm ? "(LIVE RUN)" : "(DRY RUN — pass --confirm to write)"} ===\n`);

  const rows = await Employee.collection
    .find({}, { projection: { basicSalary: 1, grossSalary: 1 } })
    .toArray() as unknown as RawEmployeeRow[];

  let alreadyDone = 0;
  const updates: Array<{ _id: unknown; basicSalary: string; grossSalary: string }> = [];

  for (const row of rows) {
    const basicDone = isAlreadyEncrypted(row.basicSalary);
    const grossDone = isAlreadyEncrypted(row.grossSalary);
    if (basicDone && grossDone) {
      alreadyDone++;
      continue;
    }
    updates.push({
      _id: row._id,
      basicSalary: basicDone ? (row.basicSalary as string) : encryptSecret(String(row.basicSalary)),
      grossSalary: grossDone ? (row.grossSalary as string) : encryptSecret(String(row.grossSalary)),
    });
  }

  console.log(`Employee: ${updates.length} document(s) need encryption, ${alreadyDone} already encrypted, ${rows.length} total`);

  if (updates.length === 0) {
    console.log("\nNothing to migrate — every row is already encrypted. Exiting.");
    process.exit(0);
  }

  if (!confirm) {
    console.log("\nDry run only — no changes written. Re-run with --confirm to apply.\n");
    process.exit(0);
  }

  let written = 0;
  for (const update of updates) {
    await Employee.collection.updateOne(
      { _id: update._id },
      { $set: { basicSalary: update.basicSalary, grossSalary: update.grossSalary } },
    );
    written++;
  }

  console.log(`\n=== Migration committed: encrypted ${written} document(s) ===\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
