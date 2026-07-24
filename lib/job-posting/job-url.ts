// Shared by every provider that needs a URL to point candidates/crawlers at
// for a given job. IMPORTANT, disclosed gap: this app has no public,
// unauthenticated job-listing/apply page — /jobs/[id] (see
// features/jobs/components/share-job-button.tsx) is behind the app's auth
// layout. Using it here is the same pragmatic choice ShareJobButton already
// makes ("send a teammate to this page"), but it means a real external
// candidate or Indeed's crawler hitting this URL will land on a login page,
// not a real listing. Building a genuine public job page is a separate,
// additional feature this plan does not include — flagged here rather than
// silently assumed to work.
export function buildJobUrl(jobId: string): string {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/jobs/${jobId}`;
}
