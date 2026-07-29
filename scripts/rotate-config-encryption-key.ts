import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import type { Collection } from "mongodb";
import { connectDB } from "@/server/db/connect";
import { CompanyIntegrationConfig, CalendarConnection, User, Employee } from "@/models";
import { parseEncryptionKey } from "@/lib/crypto";
import { rotateField, type RotateFieldOptions } from "@/lib/rotate-encrypted-field";

// Re-encrypts every field this app has ever encrypted with lib/crypto.ts
// (see that file's header comment for the full list) under a NEW key,
// without ever needing both keys live in the running app at once. Dry-run
// by default; pass --confirm to write. Idempotent (see
// lib/rotate-encrypted-field.ts's rotateField for how).
//
// This script ONLY handles the data side. After a successful --confirm
// run, you must still update CONFIG_ENCRYPTION_KEY in your environment
// (e.g. Vercel's env vars) to the value you set NEW_CONFIG_ENCRYPTION_KEY
// to, and redeploy — this script never touches deployment config itself,
// matching scripts/create-company.ts's "one clearly-scoped mutation, hand
// back to the operator for the infra step" pattern.
//
// This mutates every encrypted field across every company. Never run
// automatically. The --confirm run against production requires the exact
// same explicit operator sign-off as scripts/migrate-tenancy.ts and
// scripts/migrate-encrypt-employee-salaries.ts.

type FieldTarget = {
  getCollection: () => Collection;
  fieldPath: string; // dot-notation for nested fields, e.g. "email.smtpPasswordEncrypted" — MongoDB's $set understands this natively
  label: string;
  options?: RotateFieldOptions;
};

const FIELD_TARGETS: FieldTarget[] = [
  { getCollection: () => CompanyIntegrationConfig.collection, fieldPath: "webhookAuthHeaderValueEncrypted", label: "CompanyIntegrationConfig.webhookAuthHeaderValueEncrypted" },
  { getCollection: () => CompanyIntegrationConfig.collection, fieldPath: "email.smtpPasswordEncrypted", label: "CompanyIntegrationConfig.email.smtpPasswordEncrypted" },
  { getCollection: () => CompanyIntegrationConfig.collection, fieldPath: "facebook.appSecretEncrypted", label: "CompanyIntegrationConfig.facebook.appSecretEncrypted" },
  { getCollection: () => CompanyIntegrationConfig.collection, fieldPath: "facebook.pageAccessTokenEncrypted", label: "CompanyIntegrationConfig.facebook.pageAccessTokenEncrypted" },
  { getCollection: () => CompanyIntegrationConfig.collection, fieldPath: "x.apiSecretEncrypted", label: "CompanyIntegrationConfig.x.apiSecretEncrypted" },
  { getCollection: () => CompanyIntegrationConfig.collection, fieldPath: "x.accessTokenEncrypted", label: "CompanyIntegrationConfig.x.accessTokenEncrypted" },
  { getCollection: () => CompanyIntegrationConfig.collection, fieldPath: "x.accessTokenSecretEncrypted", label: "CompanyIntegrationConfig.x.accessTokenSecretEncrypted" },
  { getCollection: () => CalendarConnection.collection, fieldPath: "accessTokenEncrypted", label: "CalendarConnection.accessTokenEncrypted" },
  { getCollection: () => CalendarConnection.collection, fieldPath: "refreshTokenEncrypted", label: "CalendarConnection.refreshTokenEncrypted" },
  { getCollection: () => User.collection, fieldPath: "mfaSecretEncrypted", label: "User.mfaSecretEncrypted" },
  { getCollection: () => Employee.collection, fieldPath: "basicSalary", label: "Employee.basicSalary", options: { tolerateLegacyPlaintextNumber: true } },
  { getCollection: () => Employee.collection, fieldPath: "grossSalary", label: "Employee.grossSalary", options: { tolerateLegacyPlaintextNumber: true } },
];

async function main() {
  const confirm = process.argv.includes("--confirm");
  await connectDB();

  const oldKeyRaw = process.env.CONFIG_ENCRYPTION_KEY;
  const newKeyRaw = process.env.NEW_CONFIG_ENCRYPTION_KEY;
  if (!oldKeyRaw) throw new Error("CONFIG_ENCRYPTION_KEY is not set.");
  if (!newKeyRaw) {
    throw new Error(
      "NEW_CONFIG_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and set it (temporarily, just for this script's run) before running this again.",
    );
  }

  const oldKey = parseEncryptionKey(oldKeyRaw, "CONFIG_ENCRYPTION_KEY");
  const newKey = parseEncryptionKey(newKeyRaw, "NEW_CONFIG_ENCRYPTION_KEY");
  if (oldKey.equals(newKey)) throw new Error("NEW_CONFIG_ENCRYPTION_KEY is identical to CONFIG_ENCRYPTION_KEY — nothing to rotate to.");

  console.log(`\n=== Encryption key rotation ${confirm ? "(LIVE RUN)" : "(DRY RUN — pass --confirm to write)"} ===\n`);

  let totalErrors = 0;
  let totalRotated = 0;
  for (const target of FIELD_TARGETS) {
    const result = await rotateField(
      target.getCollection(),
      target.fieldPath,
      oldKey,
      newKey,
      confirm,
      target.options,
      (docId, message) => console.error(`  ERROR: ${target.label} on ${docId}: ${message} — left untouched`),
    );
    console.log(
      `${target.label}: ${result.rotated} to rotate, ${result.alreadyOnNewKey} already on new key, ${result.legacyPlaintextSkipped} legacy plaintext skipped, ${result.errors} error(s)`,
    );
    totalErrors += result.errors;
    totalRotated += result.rotated;
  }

  if (totalErrors > 0) {
    console.log(`\n${totalErrors} field(s) could not be decrypted with EITHER key — review the errors above. Those were left untouched.`);
  }

  if (!confirm) {
    console.log(`\nWould rotate ${totalRotated} field(s) total. Dry run only — no changes written. Re-run with --confirm to apply.\n`);
    process.exit(totalErrors > 0 ? 1 : 0);
  }

  console.log(`\n=== Rotation committed: re-encrypted ${totalRotated} field(s) under the new key ===`);
  console.log(
    "\nNext step (not done by this script): update CONFIG_ENCRYPTION_KEY in your deployment's environment variables " +
      "to the same value you used for NEW_CONFIG_ENCRYPTION_KEY here, then redeploy.\n",
  );
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Key rotation failed:", err);
  process.exit(1);
});
