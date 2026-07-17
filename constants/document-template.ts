// Client-safe: no Mongoose/model imports here.
export const FIELD_TYPES = ["text", "number", "date", "select", "calculated", "table", "conditional", "image"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const CALCULATION_TYPES = ["percentage_of_basic", "percentage_of_gross", "fixed"] as const;
export type CalculationType = (typeof CALCULATION_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  calculated: "Calculated (salary-based)",
  table: "Table (repeating rows)",
  conditional: "Conditional (show/hide section)",
  image: "Image",
};

export const CALCULATION_TYPE_LABELS: Record<CalculationType, string> = {
  percentage_of_basic: "% of Basic Salary",
  percentage_of_gross: "% of Gross Salary",
  fixed: "Fixed Amount",
};

// Tags a whole template as the one to use for a given employee milestone —
// lets the dashboard's "Upcoming Employee Actions" widget deep-link
// straight to document generation with the right template preselected
// (see lib/employee-milestones.ts's buildUpcomingEmployeeActions and
// features/documents/services/document-template.service.ts's
// findTemplateForMilestone). Optional — most templates aren't tied to a
// milestone at all.
export const TEMPLATE_MILESTONE_TYPES = ["probation", "confirmation", "increment_eligibility", "contract_renewal"] as const;
export type TemplateMilestoneType = (typeof TEMPLATE_MILESTONE_TYPES)[number];

export const TEMPLATE_MILESTONE_TYPE_LABELS: Record<TemplateMilestoneType, string> = {
  probation: "Probation Ending",
  confirmation: "Confirmation Due",
  increment_eligibility: "Increment Due",
  contract_renewal: "Contract Renewal Due",
};
