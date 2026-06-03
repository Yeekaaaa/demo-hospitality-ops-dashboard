import type { OperatingReportLine } from "@/lib/actual-data-subject-bridge";
import type {
  ChartUnit,
  SmartChartCategoryRow,
  SmartChartInput,
  SmartChartMetric,
  SmartChartModule,
  SmartChartPoint
} from "@/lib/smart-chart/types";

export type DashboardTrendLike = {
  周期: string;
  收入: number;
  成本: number;
  利润: number;
};

export type FinancialTrendRowLike = Record<string, unknown>;

function chartUnitFromOperatingUnit(unit: string): ChartUnit {
  if (unit === "%") return "percent";
  if (unit.includes("间夜") || unit.includes("间")) return "count";
  if (unit === "元") return "yuan";
  return "yuan";
}

function readNumber(row: FinancialTrendRowLike, keys: readonly string[]): number | null {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return null;
}

function readPeriod(row: FinancialTrendRowLike): string {
  const raw = row.month ?? row.月份 ?? row.周期;
  return typeof raw === "string" ? raw : String(raw ?? "");
}

/** 驾驶舱 / 酒店 / 餐饮趋势点 → SmartChartInput */
export function fromDashboardTrend(
  points: DashboardTrendLike[],
  module: SmartChartModule = "dashboard"
): SmartChartInput {
  const series: SmartChartPoint[] = points.map((p) => ({
    period: p.周期,
    revenue: p.收入,
    cost: p.成本,
    profit: p.利润
  }));
  return {
    module,
    periodCount: points.length,
    series,
    metrics: ["revenue", "cost", "profit"],
    unitDefault: "yuan",
    layoutIntent: "trend"
  };
}

/** 财报 / 预算宽表趋势行 → SmartChartInput */
export function fromFinancialTrendRows(
  rows: FinancialTrendRowLike[],
  module: SmartChartModule = "financial"
): SmartChartInput {
  const series: SmartChartPoint[] = [];
  for (const row of rows) {
    const period = readPeriod(row);
    if (!period) continue;
    series.push({
      period,
      revenue: readNumber(row, ["实际收入", "actualRevenue"]),
      cost: readNumber(row, ["实际成本", "actualCost"]),
      profit: readNumber(row, ["实际利润", "actualProfit"]),
      actual: readNumber(row, ["actual", "实际收入"]),
      budget: readNumber(row, ["budget", "预算收入"])
    });
  }

  const hasBudget = rows.some(
    (row) =>
      readNumber(row, ["预算收入", "budgetRevenue", "budget"]) != null ||
      readNumber(row, ["预算成本", "budgetCost"]) != null
  );

  return {
    module,
    periodCount: series.length,
    series,
    metrics: ["revenue", "cost", "profit"],
    hasBudget,
    unitDefault: "yuan",
    layoutIntent: "trend"
  };
}

/** 单期经营科目明细 → SmartChartInput */
export function fromOperatingReportLines(
  lines: OperatingReportLine[],
  module: SmartChartModule = "financial"
): SmartChartInput {
  const categories: SmartChartCategoryRow[] = lines.map((line) => ({
    id: line.label,
    label: line.label,
    actual: line.actual,
    budget: line.budget,
    unit: chartUnitFromOperatingUnit(line.unit),
    group: line.group
  }));

  const hasBudget = lines.some((l) => l.budget !== 0);

  return {
    module,
    periodCount: 1,
    categories,
    hasBudget,
    unitDefault: "yuan",
    layoutIntent: "composition"
  };
}

/** 单指标多期 actual/budget 宽表（供 line_dual 测试与调用方使用） */
export function fromFinancialTrendRowsSingleMetric(
  rows: FinancialTrendRowLike[],
  module: SmartChartModule,
  metric: SmartChartMetric = "revenue"
): SmartChartInput {
  const actualKeys: Record<SmartChartMetric, string[]> = {
    revenue: ["实际收入", "actual"],
    cost: ["实际成本"],
    profit: ["实际利润"],
    margin: ["actual"],
    occupancy: ["actual"],
    adr: ["actual"],
    revpar: ["actual"],
    rooms_sold: ["actual"],
    rooms_available: ["actual"],
    room_revenue: ["实际收入"],
    customer_spend: ["actual"],
    waste_rate: ["actual"],
    gross_margin: ["actual"],
    custom: ["actual"]
  };
  const budgetKeys: Record<SmartChartMetric, string[]> = {
    revenue: ["预算收入", "budget"],
    cost: ["预算成本"],
    profit: ["预算利润"],
    margin: ["budget"],
    occupancy: ["budget"],
    adr: ["budget"],
    revpar: ["budget"],
    rooms_sold: ["budget"],
    rooms_available: ["budget"],
    room_revenue: ["预算收入"],
    customer_spend: ["budget"],
    waste_rate: ["budget"],
    gross_margin: ["budget"],
    custom: ["budget"]
  };

  const series: SmartChartPoint[] = [];
  for (const row of rows) {
    const period = readPeriod(row);
    if (!period) continue;
    series.push({
      period,
      actual: readNumber(row, actualKeys[metric]),
      budget: readNumber(row, budgetKeys[metric])
    });
  }

  return {
    module,
    periodCount: series.length,
    series,
    metrics: [metric],
    hasBudget: true,
    unitDefault: "yuan",
    layoutIntent: "trend"
  };
}
