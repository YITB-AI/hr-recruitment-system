"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Copies the internal job-detail link — /jobs/[id] is behind auth, so this
// is "send a teammate to this page," not a public job-board posting. No
// job-board/social integration exists to build a real "post publicly"
// action against.
export function ShareJobButton({ jobId }: { jobId: string }) {
  async function handleShare() {
    const url = `${window.location.origin}/jobs/${jobId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Job link copied to clipboard");
  }

  return (
    <Button variant="outline" onClick={handleShare}>
      <Share2 className="size-4" />
      Share Job
    </Button>
  );
}
