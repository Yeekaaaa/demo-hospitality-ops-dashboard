import type { ChartUnit, SmartChartCategoryRow, SmartChartPoint } from "@/lib/smart-chart/types";
import type { SmartChartFinancialTrendMetric } from "@/lib/smart-chart/renderer-types";

/** 与 CockpitTrendChart / TrendChart 兼容的三线趋势点（金额单位：元） */
export type DashboardTrendLikePoint = {
  周期: string;
  收入: number;
  成本: number;
  利润: number;
};

export type SmartChartTableRow = {
  label: string;
  actual: number;
  budget?: number;
  unit: ChartUnit;
  group?: string;
};

function finiteNumber(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function pickSeriesActual(
  point: SmartChartPoint,
  metric: SmartChartFinancialTrendMetric
): number | null {
  if (typeof point.actual === "number" && Number.isFinite(point.actual)) {
    return point.actual;
  }
  switch (metric) {
    case "收入":
      return typeof point.revenue === "number" && Number.isFinite(point.revenue)
        ? point.revenue
        : null;
    case "成本":
      return typeof point.cost === "number" && Number.isFinite(point.cost) ? point.cost : null;
    case "利润":
      return typeof point.profit === "number" && Number.isFinite(point.profit)
        ? point.profit
        : null;
    default:
      return null;
  }
}

function pickSeriesBudget(point: SmartChartPoint): number | null {
  if (typeof point.budget === "number" && Number.isFinite(point.budget)) {
    return point.budget;
  }
  return null;
}

const FINANCIAL_ACTUAL_KEYS: Record<SmartChartFinancialTrendMetric, string> = {
  收入: "实际收入",
  成本: "实际成本",
  利润: "实际利润",
  出租率: "actual",
  RevPAR: "actual",
  ADR: "actual"
};

const FINANCIAL_BUDGET_KEYS: Record<SmartChartFinancialTrendMetric, string> = {
  收入: "预算收入",
  成本: "预算成本",
  利润: "预算利润",
  出租率: "budget",
  RevPAR: "budget",
  ADR: "budget"
};

/** SmartChartPoint[] → 驾驶舱 / 通用三线折线图数据 */
export function seriesToDashboardTrendPoints(
  series?: SmartChartPoint[]
): DashboardTrendLikePoint[] {
  if (!Array.isArray(series) || series.length === 0) return [];

  return series
    .map((point) => {
      const period = typeof point.period === "string" ? point.period.trim() : "";
      if (!period) return null;
      return {
        周期: period,
        收入: finiteNumber(point.revenue),
        成本: finiteNumber(point.cost),
        利润: finiteNumber(point.profit)
      };
    })
    .filter((row): row is DashboardTrendLikePoint => row != null);
}

/**
 * SmartChartPoint[] → FinancialTrendChart 宽表行
 * 保留 actual/budget 与中文键，便于组件 metricKeyMap 解析
 */
export function seriesToFinancialTrendRows(
  series: SmartChartPoint[] | undefined,
  metric: SmartChartFinancialTrendMetric
): Array<Record<string, unknown>> {
  if (!Array.isArray(series) || series.length === 0) return [];

  const actualKey = FINANCIAL_ACTUAL_KEYS[metric];
  const budgetKey = FINANCIAL_BUDGET_KEYS[metric];

  return series
    .map((point) => {
      const period = typeof point.period === "string" ? point.period.trim() : "";
      if (!period) return null;

      const actual = pickSeriesActual(point, metric);
      const budget = pickSeriesBudget(point);
      if (actual == null && budget == null) return null;

      const row: Record<string, unknown> = {
        周期: period,
        month: period,
        actual: actual ?? 0,
        budget: budget ?? 0
      };
      if (actual != null) row[actualKey] = actual;
      if (budget != null) row[budgetKey] = budget;
      return row;
    })
    .filter((row): row is Record<string, unknown> => row != null);
}

/** SmartChartCategoryRow[] → 简单只读表格行 */
export function categoriesToTableRows(
  categories?: SmartChartCategoryRow[]
): SmartChartTableRow[] {
  if (!Array.isArray(categories) || categories.length === 0) return [];

  return categories.map((category) => ({
    label: category.label,
    actual: finiteNumber(category.actual),
    budget:
      typeof category.budget === "number" && Number.isFinite(category.budget)
        ? category.budget
        : undefined,
    unit: category.unit,
    group: category.group
  }));
}
