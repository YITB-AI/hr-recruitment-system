import type { StatTrend } from "@/types/dashboard";

export function getWeekWindows(now: Date) {
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 7);

  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - 14);

  return { previousStart, currentStart, now };
}

export function computeTrend(currentPeriodCount: number, previousPeriodCount: number): StatTrend {
  if (previousPeriodCount === 0) {
    return currentPeriodCount === 0
      ? { direction: "flat", percentage: 0 }
      : { direction: "up", percentage: 100 };
  }

  const change = ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;

  return {
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    percentage: Math.round(Math.abs(change)),
  };
}
