import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db/connect";
import { Company } from "@/models/Company";
import { User } from "@/models/User";

// Run when onboarding a new client company (internal/admin-provisioned —
// there is no public signup in this app). Creates the Company row and its
// first admin user with a temporary password that must be changed at first
// login (see mustChangePassword on models/User.ts).
//
// Usage:
//   npm run create:company -- --name "Acme Inc" --slug acme --admin-name "Jane Doe" --admin-email jane@acme.com

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    name: get("--name"),
    slug: get("--slug"),
    adminName: get("--admin-name"),
    adminEmail: get("--admin-email"),
  };
}

function generateTempPassword(): string {
  // Base64url of 9 random bytes -> 12 URL-safe characters, well above the
  // 8-char minimum enforced on real password changes.
  return crypto.randomBytes(9).toString("base64url");
}

async function main() {
  const { name, slug, adminName, adminEmail } = parseArgs();
  if (!name || !slug || !adminName || !adminEmail) {
    console.error(
      'Usage: npm run create:company -- --name "Acme Inc" --slug acme --admin-name "Jane Doe" --admin-email jane@acme.com',
    );
    process.exit(1);
  }

  await connectDB();

  const normalizedSlug = slug.toLowerCase().trim();
  const existing = await Company.findOne({ slug: normalizedSlug });
  if (existing) {
    console.error(`A company with slug "${normalizedSlug}" already exists (id ${existing._id}).`);
    process.exit(1);
  }

  const company = await Company.create({ name, slug: normalizedSlug });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const admin = await User.create({
    companyId: company._id,
    name: adminName,
    email: adminEmail.toLowerCase().trim(),
    passwordHash,
    role: "admin",
    mustChangePassword: true,
  });

  console.log("\n=== Company created ===");
  console.log(`Name:       ${company.name}`);
  console.log(`Company ID: ${company.slug}  (enter this on the login form)`);
  console.log("\n=== Admin user created ===");
  console.log(`Name:     ${admin.name}`);
  console.log(`Email:    ${admin.email}`);
  console.log(`Password: ${tempPassword}`);
  console.log("\nShare the Company ID, email, and password with the admin over a secure channel (not plain email/Slack).");
  console.log("They will be required to set their own password on first login.\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create company:", err);
  process.exit(1);
});
