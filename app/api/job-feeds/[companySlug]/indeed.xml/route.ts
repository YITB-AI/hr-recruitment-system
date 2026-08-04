import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { companyRepository } from "@/server/repositories/company.repository";
import { jobRepository } from "@/server/repositories/job.repository";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";
import { hasCompanyFeature } from "@/lib/auth/feature-access";
import { buildJobUrl } from "@/lib/job-posting/job-url";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Public, unauthenticated — this is exactly the point (Indeed's crawler has
// no session). Tenant-scoped by resolving companySlug -> a real companyId
// first, then only ever querying jobs for THAT company, opted in
// (postToIndeed) and open — never a cross-company query. See
// lib/job-posting/job-url.ts for the disclosed gap in the <url> field this
// emits (points at an auth-gated internal page, not a real public listing).
export async function GET(_request: Request, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  await connectDB();

  const company = await companyRepository.findBySlug(companySlug);
  if (!company) return new NextResponse("Not found", { status: 404 });
  // Two independent gates: the Global Super Admin must have granted the
  // Job Board Feed (Indeed) module at all, AND the company's own admin must
  // have opted in via config.indeed.feedEnabled -- neither substitutes for
  // the other.
  if (!hasCompanyFeature(company, "indeedJobFeed")) return new NextResponse("Not found", { status: 404 });

  const config = await companyIntegrationConfigRepository.get(company._id);
  if (!config.indeed.feedEnabled) return new NextResponse("Feed not enabled", { status: 404 });

  const jobs = await jobRepository.findAllForIndeedFeed(company._id);

  const items = jobs
    .map(
      (job) => `  <job>
    <title>${escapeXml(job.title)}</title>
    <date>${escapeXml(job.createdAt ?? new Date().toISOString())}</date>
    <referencejobnumber>${escapeXml(job.job_id)}</referencejobnumber>
    <url>${escapeXml(buildJobUrl(job._id))}</url>
    <company>${escapeXml(company.name)}</company>
    <city>${escapeXml(job.city)}</city>
    <state>${escapeXml(job.state)}</state>
    <country>${escapeXml(job.country)}</country>
    <description>${escapeXml(job.description ?? "")}</description>
    <jobtype>${escapeXml(job.type ?? "")}</jobtype>
  </job>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>${escapeXml(company.name)}</publisher>
${items}
</source>`;

  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
