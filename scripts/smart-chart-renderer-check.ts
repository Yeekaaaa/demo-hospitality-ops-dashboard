/**
 * Smart Chart Renderer 渲染计划验收
 * npx --yes tsx scripts/smart-chart-renderer-check.ts
 */
import { fromDashboardTrend, fromFinancialTrendRowsSingleMetric } from "../lib/smart-chart/adapters";
import { recommendSmartChart } from "../lib/smart-chart/recommend";
import { resolveSmartChartRendererPlan } from "../lib/smart-chart/resolve-renderer";
import {
  categoriesToTableRows,
  seriesToDashboardTrendPoints,
  seriesToFinancialTrendRows
} from "../lib/smart-chart/transforms";
import type { SmartChartRecommendation } from "../lib/smart-chart/types";

const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    failures.push(detail ? `${name}: ${detail}` : name);
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function rec(chartType: SmartChartRecommendation["chartType"], extra?: Partial<SmartChartRecommendation>): SmartChartRecommendation {
  return {
    chartType,
    reasons: [],
    labelZh: `测试 ${chartType}`,
    ...extra
  };
}

// 1. line + cockpit → CockpitTrendChart
{
  const recommendation = rec("line", { rendererHint: "CockpitTrendChart" });
  const plan = resolveSmartChartRendererPlan(recommendation, {
    lineVariant: "cockpit",
    series: [{ period: "2026-01", revenue: 1, cost: 2, profit: 3 }]
  });
  assert(
    "line + cockpit → CockpitTrendChart",
    plan.supported && plan.rendererHint === "CockpitTrendChart",
    `got supported=${plan.supported} hint=${plan.rendererHint}`
  );
}

// 2. line + simple → TrendChart
{
  const plan = resolveSmartChartRendererPlan(rec("line"), {
    lineVariant: "simple",
    series: [{ period: "2026-01", revenue: 1, cost: 2, profit: 3 }]
  });
  assert(
    "line + simple → TrendChart",
    plan.supported && plan.rendererHint === "TrendChart",
    `got hint=${plan.rendererHint}`
  );
}

// 3. line_dual + financial payload → FinancialTrendChart
{
  const input = fromFinancialTrendRowsSingleMetric(
    [
      { 周期: "2026-01", 实际收入: 100, 预算收入: 120 },
      { 周期: "2026-02", 实际收入: 110, 预算收入: 125 }
    ],
    "financial",
    "revenue"
  );
  const recommendation = recommendSmartChart(input);
  const rows = seriesToFinancialTrendRows(input.series, "收入");
  const plan = resolveSmartChartRendererPlan(recommendation, {
    financial: { rows, mode: "实际对比预算", metric: "收入" }
  });
  assert(
    "line_dual + financial → FinancialTrendChart",
    plan.supported && plan.rendererHint === "FinancialTrendChart",
    `chartType=${recommendation.chartType} hint=${plan.rendererHint}`
  );
}

// 4. line_dual 缺 financial → unsupported + message_only
{
  const plan = resolveSmartChartRendererPlan(rec("line_dual", { rendererHint: "FinancialTrendChart" }), {});
  assert(
    "line_dual missing financial → unsupported",
    !plan.supported && plan.fallback === "message_only",
    `supported=${plan.supported} fallback=${plan.fallback}`
  );
}

// 5. table → supported + table
{
  const plan = resolveSmartChartRendererPlan(rec("table", { rendererHint: "Table" }), {
    categories: [{ id: "1", label: "科目A", actual: 10, unit: "yuan" }]
  });
  assert(
    "table → supported + table fallback",
    plan.supported && plan.fallback === "table" && plan.rendererHint === "Table",
    `fallback=${plan.fallback}`
  );
}

// 6. empty → supported + empty
{
  const plan = resolveSmartChartRendererPlan(rec("empty"), {});
  assert(
    "empty → supported + empty fallback",
    plan.supported && plan.fallback === "empty",
    `fallback=${plan.fallback}`
  );
}

// 7. none → supported + message_only
{
  const plan = resolveSmartChartRendererPlan(rec("none"), {});
  assert(
    "none → supported + message_only",
    plan.supported && plan.fallback === "message_only",
    `fallback=${plan.fallback}`
  );
}

// 8. waterfall → unsupported
{
  const plan = resolveSmartChartRendererPlan(rec("waterfall", { rendererHint: "WaterfallChart" }), {});
  assert(
    "waterfall → unsupported",
    !plan.supported && plan.fallback === "message_only",
    `supported=${plan.supported}`
  );
}

// 9. bar_horizontal → unsupported
{
  const plan = resolveSmartChartRendererPlan(rec("bar_horizontal"), {});
  assert(
    "bar_horizontal → unsupported",
    !plan.supported,
    `supported=${plan.supported}`
  );
}

// transforms 空安全
assert("transforms empty series", seriesToDashboardTrendPoints(undefined).length === 0);
assert("transforms empty categories", categoriesToTableRows(undefined).length === 0);

// default lineVariant → CockpitTrendChart（多期 dashboard adapter）
{
  const input = fromDashboardTrend([
    { 周期: "2026-01", 收入: 1, 成本: 2, 利润: 3 },
    { 周期: "2026-02", 收入: 2, 成本: 3, 利润: 4 }
  ]);
  const recommendation = recommendSmartChart(input);
  const plan = resolveSmartChartRendererPlan(recommendation, { series: input.series });
  assert(
    "line default variant → CockpitTrendChart",
    recommendation.chartType === "line" && plan.rendererHint === "CockpitTrendChart",
    `chartType=${recommendation.chartType} hint=${plan.rendererHint}`
  );
}

if (failures.length > 0) {
  console.error("\nFAILED:", failures.join("; "));
  process.exit(1);
}

console.log("\nAll smart-chart renderer checks passed.");
