import type { SmartChartMetric, SmartChartModule } from "@/lib/smart-chart/types";

const RESTAURANT_FORBIDDEN: readonly SmartChartMetric[] = [
  "adr",
  "revpar",
  "occupancy",
  "rooms_sold",
  "rooms_available",
  "room_revenue"
];

const HOTEL_NOT_RECOMMENDED: readonly SmartChartMetric[] = [
  "customer_spend",
  "waste_rate",
  "gross_margin"
];

const MODULE_FORBIDDEN: Partial<Record<SmartChartModule, readonly SmartChartMetric[]>> = {
  restaurant: RESTAURANT_FORBIDDEN,
  hotel: HOTEL_NOT_RECOMMENDED
};

export function getForbiddenMetricsForModule(module: SmartChartModule): readonly SmartChartMetric[] {
  return MODULE_FORBIDDEN[module] ?? [];
}

export function findForbiddenMetrics(
  module: SmartChartModule,
  metrics?: SmartChartMetric[]
): SmartChartMetric[] {
  if (!metrics?.length) return [];
  const blocked = new Set(getForbiddenMetricsForModule(module));
  return metrics.filter((m) => blocked.has(m));
}
