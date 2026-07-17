import { formatDateWithPreset } from "@/lib/date-format";
import type { TemplateMilestoneType } from "@/constants/document-template";

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

export type EmployeeActionItem = {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  action: string;
  milestoneType: TemplateMilestoneType;
  dueDate: Date;
};

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Powers the dashboard's "Upcoming Employee Actions" widget — pure
// computation over active employees, no stored reminders/cron job needed
// since every date is deterministic from joiningDate.
export function buildUpcomingEmployeeActions(
  employees: Array<{ _id: string; name: string; department: string; designation: string; joiningDate: Date; employmentType: string }>,
  now: Date,
  upcomingWindowDays: number,
): { today: EmployeeActionItem[]; upcoming: EmployeeActionItem[] } {
  const today: EmployeeActionItem[] = [];
  const upcoming: EmployeeActionItem[] = [];
  const windowEnd = new Date(now.getTime() + upcomingWindowDays * 24 * 60 * 60 * 1000);

  for (const employee of employees) {
    if (!employee.joiningDate) continue;
    const milestones = getEmployeeMilestones(employee.joiningDate, employee.employmentType);

    const candidates: Array<{ action: string; milestoneType: TemplateMilestoneType; date: Date; recurring: boolean }> = [
      { action: "Probation Ending", milestoneType: "probation", date: milestones.probationEndDate, recurring: false },
      { action: "Confirmation Due", milestoneType: "confirmation", date: milestones.confirmationDate, recurring: false },
      { action: "Increment Due", milestoneType: "increment_eligibility", date: milestones.incrementEligibilityDate, recurring: true },
    ];
    if (milestones.contractRenewalDate) {
      candidates.push({
        action: "Contract Renewal Due",
        milestoneType: "contract_renewal",
        date: milestones.contractRenewalDate,
        recurring: true,
      });
    }

    for (const candidate of candidates) {
      const dueDate = candidate.recurring ? getNextOccurrence(candidate.date, now) : candidate.date;
      // A one-time milestone (probation/confirmation) that already passed
      // and isn't today is simply over — nothing to surface.
      if (dueDate.getTime() < now.getTime() && !isSameDay(dueDate, now)) continue;

      const item: EmployeeActionItem = {
        employeeId: employee._id,
        employeeName: employee.name,
        department: employee.department,
        designation: employee.designation,
        action: candidate.action,
        milestoneType: candidate.milestoneType,
        dueDate,
      };
      if (isSameDay(dueDate, now)) today.push(item);
      else if (dueDate.getTime() <= windowEnd.getTime()) upcoming.push(item);
    }
  }

  today.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return { today, upcoming };
}

// Shared by generate-document.service.ts (server) and
// generate-document-wizard.tsx (client preview) so a milestone date is
// never formatted differently in the wizard's preview than in the actual
// generated document. `preset` is the effective date format (a template
// field's own override, or the company-wide Setting.dateFormat default) —
// omitting it keeps the original hardcoded long-form behavior, so every
// existing caller that predates this option is unaffected.
export function formatMilestoneDate(date: Date, preset?: string): string {
  return formatDateWithPreset(date, preset);
}
