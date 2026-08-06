import { Loader2Icon } from "lucide-react";

// Rendered by loading.tsx at each route-group's segment level
// (app/(app), app/platform, app/(auth)) -- Next.js automatically wraps
// each segment's page.tsx in a Suspense boundary and shows this
// immediately on navigation, while the destination page's own data
// fetching is still in flight. The surrounding layout (sidebar/topbar
// chrome) stays mounted and interactive; only the content area shows
// this. This is the officially-recommended fix for "dynamic routes
// without loading.tsx" feeling unresponsive (see Next's own
// linking-and-navigating guide) -- every route in this app is
// `dynamic = "force-dynamic"`, so every one of them was hitting this
// exact gap before these files existed.
export function PageLoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
