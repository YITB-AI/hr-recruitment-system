import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { getInboundWebhookSecret } from "@/config/webhooks";
import { aiCallWebhookSchema } from "@/validators/ai-call-webhook";
import { applicantFollowupRepository } from "@/server/repositories/applicant-followup.repository";
import { handleCallStarted, handleCallCompleted, handleCallFailed } from "@/features/applicants/services/call-outcome.service";

// n8n calling BACK into this app with AI-call progress/outcome. There is no
// session cookie here — n8n is a server, not a browser — so this route must
// never call getCurrentUser() (it would try to redirect to /login, which
// makes no sense for a JSON API). Authorization is a shared secret instead;
// tenant/record identity is resolved from the followupId row itself, never
// trusted from the request body — see findByIdUnscoped's own comment.
const MAX_BODY_BYTES = 50_000;

function isAuthorized(request: Request): boolean {
  const secret = getInboundWebhookSecret();
  if (!secret) return false; // fail closed if the operator hasn't configured one yet

  const provided = request.headers.get("x-callback-secret") ?? "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, and a plain === comparison would leak timing information about
  // how many leading bytes matched (SECURITY_STANDARDS.md's OWASP-alignment
  // requirement) — so length is checked separately first.
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = aiCallWebhookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 422 });
  }

  await connectDB();
  const followup = await applicantFollowupRepository.findByIdUnscoped(parsed.data.followupId);
  if (!followup || followup.type !== "call") {
    return NextResponse.json({ error: "Unknown followupId" }, { status: 404 });
  }
  // The load-bearing tenant-isolation check: companyId/applicantId always
  // come from the row we just loaded, never from the request body — this
  // just cross-checks the body's applicantId matches, to catch a
  // misconfigured n8n workflow (or a tampered followupId) rather than
  // silently acting on the wrong applicant.
  if (followup.applicantId !== parsed.data.applicantId) {
    return NextResponse.json({ error: "applicantId does not match followupId" }, { status: 422 });
  }

  switch (parsed.data.event) {
    case "started":
      await handleCallStarted(followup);
      break;
    case "completed":
      await handleCallCompleted(followup, parsed.data);
      break;
    case "failed":
      await handleCallFailed(followup, parsed.data.error);
      break;
  }

  return NextResponse.json({ success: true });
}
