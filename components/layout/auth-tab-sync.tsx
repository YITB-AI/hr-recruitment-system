"use client";

import { useEffect } from "react";
import { LOGOUT_BROADCAST_KEY } from "@/lib/auth/broadcast";

// Mounted once inside the authenticated app shell. When any tab logs out, it
// writes LOGOUT_BROADCAST_KEY to localStorage (see profile-menu.tsx); every
// other open tab on this origin receives a `storage` event for that write
// (the tab that made it does not) and hard-navigates to /login so it can't
// keep showing authenticated content after the session has been revoked.
export function AuthTabSync() {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === LOGOUT_BROADCAST_KEY && event.newValue) {
        window.location.href = "/login";
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}
