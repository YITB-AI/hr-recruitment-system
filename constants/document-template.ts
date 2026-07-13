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
