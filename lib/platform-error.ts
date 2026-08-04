import { connectDB } from "@/server/db/connect";
import { platformErrorLogRepository, type PlatformErrorSource } from "@/server/repositories/platform-error-log.repository";

// Best-effort, cross-tenant error capture for the Global Super Admin
// dashboard's error count — deliberately never throws. A logging failure
// must never take down the real request/job that triggered it; the
// original error is still console.error'd by the caller as before, this is
// purely an additional, non-blocking write.
export async function logPlatformError(input: {
  source: PlatformErrorSource;
  error: unknown;
  companyId?: string;
  action?: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    await connectDB();
    const message = input.error instanceof Error ? input.error.message : String(input.error);
    const stack = input.error instanceof Error ? input.error.stack : undefined;
    await platformErrorLogRepository.create({
      companyId: input.companyId,
      source: input.source,
      action: input.action,
      message,
      stack,
      context: input.context,
    });
  } catch (loggingError) {
    console.error("Failed to write platform error log (original error follows):", loggingError, input.error);
  }
}
