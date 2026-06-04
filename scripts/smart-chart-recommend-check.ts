/**
 * Smart Chart 推荐规则验收
 * npx --yes tsx scripts/smart-chart-recommend-check.ts
 */
import {
  fromDashboardTrend,
  fromFinancialTrendRowsSingleMetric,
  fromOperatingReportLines
} from "../lib/smart-chart/adapters";
import { recommendSmartChart } from "../lib/smart-chart/recommend";
import type { SmartChartCategoryRow, SmartChartInput } from "../lib/smart-chart/types";

const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    failures.push(detail ? `${name}: ${detail}` : name);
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function expectType(input: SmartChartInput, chartType: string, name: string) {
  const rec = recommendSmartChart(input);
  assert(
    name,
    rec.chartType === chartType,
    `expected ${chartType}, got ${rec.chartType} (${rec.labelZh})`
  );
}

// 多期收入/成本/利润 → line
const multiPeriod = fromDashboardTrend(
  [
    { 周期: "2026-01", 收入: 1_000_000, 成本: 600_000, 利润: 400_000 },
    { 周期: "2026-02", 收入: 1_100_000, 成本: 650_000, 利润: 450_000 },
    { 周期: "2026-03", 收入: 1_200_000, 成本: 700_000, 利润: 500_000 }
  ],
  "dashboard"
);
expectType(multiPeriod, "line", "multi-period revenue/cost/profit → line");

// 多期 actual/budget 单指标 → line_dual
const dual = fromFinancialTrendRowsSingleMetric(
  [
    { 周期: "2026-01", 实际收入: 100, 预算收入: 120 },
    { 周期: "2026-02", 实际收入: 110, 预算收入: 125 },
    { 周期: "2026-03", 实际收入: 105, 预算收入: 130 }
  ],
  "financial",
  "revenue"
);
expectType(dual, "line_dual", "multi-period actual/budget single metric → line_dual");

// 单期 5 项成本 → bar_horizontal
const costCategories: SmartChartCategoryRow[] = [
  { id: "1", label: "人工成本", actual: 100, unit: "yuan", group: "成本类" },
  { id: "2", label: "能源费用", actual: 80, unit: "yuan", group: "成本类" },
  { id: "3", label: "品牌管理费", actual: 50, unit: "yuan", group: "成本类" },
  { id: "4", label: "客房服务成本", actual: 40, unit: "yuan", group: "成本类" },
  { id: "5", label: "原材料成本", actual: 30, unit: "yuan", group: "成本类" }
];
expectType(
  {
    module: "financial",
    periodCount: 1,
    categories: costCategories,
    layoutIntent: "composition"
  },
  "bar_horizontal",
  "single-period 5 cost items → bar_horizontal"
);

// 12 项科目 → table
const manyCategories: SmartChartCategoryRow[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  label: `科目${i + 1}`,
  actual: i * 10,
  unit: "yuan" as const,
  group: "收入类"
}));
expectType(
  {
    module: "financial",
    periodCount: 1,
    categories: manyCategories
  },
  "table",
  "12 categories → table"
);

// bridgeRole → waterfall
expectType(
  {
    module: "financial",
    periodCount: 1,
    categories: [
      { id: "a", label: "营业收入", actual: 1000, unit: "yuan", bridgeRole: "start" },
      { id: "b", label: "总成本", actual: -600, unit: "yuan", bridgeRole: "delta" },
      { id: "c", label: "经营利润", actual: 400, unit: "yuan", bridgeRole: "total" }
    ],
    layoutIntent: "bridge"
  },
  "waterfall",
  "bridgeRole categories → waterfall"
);

// restaurant + revpar → none
expectType(
  {
    module: "restaurant",
    periodCount: 2,
    series: [
      { period: "2026-01", revenue: 1, cost: 1, profit: 1 },
      { period: "2026-02", revenue: 2, cost: 2, profit: 2 }
    ],
    metrics: ["revpar"],
    layoutIntent: "trend"
  },
  "none",
  "restaurant + revpar → none"
);

// 空数据 → empty
expectType(
  {
    module: "dashboard",
    periodCount: 0,
    series: [],
    categories: []
  },
  "empty",
  "empty input → empty"
);

// 单期 KPI ≤6 → kpi_card
expectType(
  {
    module: "hotel",
    periodCount: 1,
    metrics: ["revenue", "cost", "profit"],
    layoutIntent: "kpi"
  },
  "kpi_card",
  "single-period kpi ≤6 → kpi_card"
);

console.log("");
if (failures.length > 0) {
  console.error(`\n${failures.length} 项失败`);
  process.exit(1);
}
console.log(`全部 ${9} 项通过`);
