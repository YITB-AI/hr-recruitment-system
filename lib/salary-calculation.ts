import type { CalculationType } from "@/constants/document-template";

export function resolveCalculatedValue(
  calculation: { type: CalculationType; value: number },
  salary: { basicSalary: number; grossSalary: number },
): number {
  switch (calculation.type) {
    case "percentage_of_basic":
      return Math.round((salary.basicSalary * calculation.value) / 100);
    case "percentage_of_gross":
      return Math.round((salary.grossSalary * calculation.value) / 100);
    case "fixed":
      return calculation.value;
  }
}
