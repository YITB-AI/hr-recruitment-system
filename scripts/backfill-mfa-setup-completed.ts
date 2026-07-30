import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { connectDB } from "@/server/db/connect";
import { User } from "@/models/User";

// Backfills mfaSetupCompletedAt for every existing User with mfaEnabled:true
// and no mfaSetupCompletedAt yet — being currently enabled proves they
// completed enrollment at least once already, so this avoids re-forcing
// /mfa-setup on their very next login purely because this field is new.
// Admins currently with mfaEnabled:false (never set up, or already
// disabled) are deliberately left alone — there's no historical data to
// tell those two cases apart, so they'll be asked to complete setup one
// more time (the last time, ever) under the new logic, which is the
// correct, safe default. Idempotent (only touches rows missing the field)
// and dry-run by default; pass --confirm to write. Never invoked
// automatically — same convention as every other migration in this project.

async function main() {
  const confirm = process.argv.includes("--confirm");
  await connectDB();

  console.log(`\n=== mfaSetupCompletedAt backfill ${confirm ? "(LIVE RUN)" : "(DRY RUN — pass --confirm to write)"} ===\n`);

  const filter = { mfaEnabled: true, mfaSetupCompletedAt: { $exists: false } };
  const usersToBackfill = await User.find(filter).select("name email companyId mfaEnabledAt").lean<
    Array<{ _id: unknown; name: string; email: string; companyId: unknown; mfaEnabledAt?: Date }>
  >();

  if (usersToBackfill.length === 0) {
    console.log("Nothing to backfill — every currently MFA-enabled user already has mfaSetupCompletedAt. Exiting.");
    process.exit(0);
  }

  console.log(`Would set mfaSetupCompletedAt for ${usersToBackfill.length} user(s):`);
  for (const user of usersToBackfill) {
    console.log(`  ${user.email} (company ${user.companyId}) — mfaEnabledAt: ${user.mfaEnabledAt?.toISOString() ?? "unknown"}`);
  }

  if (!confirm) {
    console.log("\nDry run only — no changes written. Re-run with --confirm to apply.\n");
    process.exit(0);
  }

  // Use each user's own mfaEnabledAt as the completion timestamp when
  // available (more historically accurate than "now") — falls back to now
  // for the rare row missing even that.
  let updated = 0;
  for (const user of usersToBackfill) {
    await User.updateOne({ _id: user._id }, { mfaSetupCompletedAt: user.mfaEnabledAt ?? new Date() });
    updated++;
  }

  console.log(`\n=== Backfill complete: ${updated} user(s) updated ===\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
