import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db/connect";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import { sendEmail } from "@/lib/email";
import { welcomeEmailHtml } from "@/lib/email-templates";

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
    // Nobody has proven ownership of this inbox yet — starts unverified,
    // same as every other freshly created account (userRepository.create).
    emailVerified: false,
  });

  // Best-effort: account creation must succeed regardless of whether the
  // welcome email actually delivers (e.g. the n8n workflow being
  // unreachable or misconfigured) — the console output below is the
  // guaranteed fallback delivery path either way.
  let emailSent = false;
  try {
    const result = await sendEmail({
      to: admin.email,
      subject: "🎉 Welcome to HR Platform — your account details",
      html: welcomeEmailHtml({
        recipientName: admin.name,
        companyName: company.name,
        companySlug: company.slug,
        email: admin.email,
        tempPassword,
      }),
    });
    emailSent = result.ok;
    if (!result.ok) console.error(`Welcome email failed to send: ${result.error}`);
  } catch (error) {
    console.error("Welcome email failed to send:", error);
  }

  console.log("\n=== Company created ===");
  console.log(`Name:       ${company.name}`);
  console.log(`Company ID: ${company.slug}  (enter this on the login form)`);
  console.log("\n=== Admin user created ===");
  console.log(`Name:     ${admin.name}`);
  console.log(`Email:    ${admin.email}`);
  console.log(`Password: ${tempPassword}`);
  console.log(`\nWelcome email: ${emailSent ? "sent" : "FAILED to send — share the credentials below manually"}`);
  console.log("Share the Company ID, email, and password with the admin over a secure channel (not plain email/Slack).");
  console.log("They will be required to set their own password on first login.\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create company:", err);
  process.exit(1);
});
