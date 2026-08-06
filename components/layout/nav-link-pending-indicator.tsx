"use client";

import { useLinkStatus } from "next/link";
import { Loader2Icon } from "lucide-react";

// Must render as a descendant of a <Link> (see Next's useLinkStatus docs) --
// a small spinner that fades in only once a click is actually still
// waiting (loading.tsx already makes most navigations feel instant; this
// covers the remaining case Next's own docs call out explicitly: a slow
// or unstable network where the destination hasn't finished prefetching
// yet). ml-auto pushes it to the end of the nav row without disturbing
// the label's layout.
export function NavLinkPendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2Icon className="ml-auto size-3.5 shrink-0 animate-spin text-current" aria-hidden />;
}
