// Employment milestone dates, derived purely from joiningDate + policy
// durations — parallel to lib/salary-calculation.ts, but these have no
// per-template configuration (they're always the same offset), so they're
// recognized keys in generate-document.service.ts's resolveKnownFieldValue
// fallback chain rather than a new document-template field type.
//
// Hardcoded company-wide defaults for now, not yet configurable per company:
// Probation End = joining + 3 months; Confirmation = same as Probation End;
// Increment Eligibility = joining + 12 months, recurring yearly; Contract
// Renewal = joining + 12 months, contract employees only, recurring yearly.

export type EmployeeMilestones = {
  probationEndDate: Date;
  confirmationDate: Date;
  incrementEligibilityDate: Date;
  contractRenewalDate: Date | null;
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// One-time, fixed dates for a given employee — used by document generation,
// where a letter should reference the actual date, not a recurring-adjusted
// one (probation only ends once; confirmation only happens once).
export function getEmployeeMilestones(joiningDate: Date, employmentType: string): EmployeeMilestones {
  const probationEndDate = addMonths(joiningDate, 3);
  return {
    probationEndDate,
    confirmationDate: probationEndDate,
    incrementEligibilityDate: addMonths(joiningDate, 12),
    contractRenewalDate: employmentType === "contract" ? addMonths(joiningDate, 12) : null,
  };
}

// Advances a yearly-recurring anniversary date to the next occurrence on or
// after `from` — used only by the dashboard widget (Increment/Contract
// Renewal genuinely recur every year; Probation End/Confirmation don't).
export function getNextOccurrence(anniversaryDate: Date, from: Date = new Date()): Date {
  let next = new Date(anniversaryDate);
  while (next.getTime() < from.getTime()) {
    next = addMonths(next, 12);
  }
  return next;
}

// Shared by generate-document.service.ts (server) and
// generate-document-wizard.tsx (client preview) so a milestone date is
// never formatted differently in the wizard's preview than in the actual
// generated document.
export function formatMilestoneDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
