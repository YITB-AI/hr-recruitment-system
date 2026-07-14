"use client";

import { createContext, useContext, useMemo } from "react";
import type { StatusRow } from "@/server/repositories/status.repository";

type StatusLookup = {
  statuses: StatusRow[];
  getStatus: (key: string) => { name: string; color: string; icon: string | null };
};

const StatusConfigContext = createContext<StatusLookup | null>(null);

function fallbackLabel(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Wraps a page (Applicants, Applicant Details, Employees, Employee Details,
// Job Details) so every status-aware component underneath — badges,
// selects, filter tabs — can resolve a status key to its current
// name/color/icon without each one fetching or being handed the list
// individually. One fetch per page (in the Server Component), one Provider,
// any depth of client components below read it via useStatusLookup().
export function StatusConfigProvider({ statuses, children }: { statuses: StatusRow[]; children: React.ReactNode }) {
  const value = useMemo<StatusLookup>(() => {
    const byKey = new Map(statuses.map((s) => [s.key, s]));
    return {
      statuses,
      getStatus: (key: string) => {
        const found = byKey.get(key);
        return found
          ? { name: found.name, color: found.color, icon: found.icon }
          : { name: fallbackLabel(key), color: "#71717a", icon: null };
      },
    };
  }, [statuses]);

  return <StatusConfigContext.Provider value={value}>{children}</StatusConfigContext.Provider>;
}

export function useStatusLookup(): StatusLookup {
  const ctx = useContext(StatusConfigContext);
  if (!ctx) {
    throw new Error("useStatusLookup must be used within a StatusConfigProvider");
  }
  return ctx;
}
