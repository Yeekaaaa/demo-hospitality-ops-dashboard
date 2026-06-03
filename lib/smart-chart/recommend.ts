import { findForbiddenMetrics } from "@/lib/smart-chart/forbidden-metrics";
import type {
  SmartChartCategoryRow,
  SmartChartInput,
  SmartChartMetric,
  SmartChartPoint,
  SmartChartReason,
  SmartChartRecommendation,
  SmartChartType
} from "@/lib/smart-chart/types";

function itemCount(input: SmartChartInput): number {
  if (input.categories?.length) return input.categories.length;
  if (input.metrics?.length) return input.metrics.length;
  return 0;
}

function isEmptyInput(input: SmartChartInput): boolean {
  const categories = input.categories ?? [];
  const series = input.series ?? [];
  if (
    input.layoutIntent === "kpi" &&
    (input.metrics?.length ?? 0) > 0 &&
    categories.length === 0 &&
    series.length === 0
  ) {
    return false;
  }
  if (categories.length === 0 && series.length === 0) return true;
  if (series.length > 0) {
    return series.every(
      (p) =>
        !Number.isFinite(p.revenue ?? NaN) &&
        !Number.isFinite(p.cost ?? NaN) &&
        !Number.isFinite(p.profit ?? NaN) &&
        !Number.isFinite(p.actual ?? NaN) &&
        !Number.isFinite(p.budget ?? NaN)
    );
  }
  if (categories.length > 0) {
    return categories.every((c) => c.actual === 0 && (c.budget ?? 0) === 0);
  }
  return false;
}

function seriesHasRevenueCostProfit(series: SmartChartPoint[]): boolean {
  if (series.length < 2) return false;
  const hasRev = series.some((p) => Number.isFinite(p.revenue ?? NaN));
  const hasCost = series.some((p) => Number.isFinite(p.cost ?? NaN));
  const hasProf = series.some((p) => Number.isFinite(p.profit ?? NaN));
  return hasRev && hasCost && hasProf;
}

function hasBridgeRole(categories: SmartChartCategoryRow[]): boolean {
  return categories.some((c) => c.bridgeRole != null);
}

function isCostStructure(categories: SmartChartCategoryRow[]): boolean {
  const costRows = categories.filter(
    (c) => c.group === "成本类" || /成本/.test(c.label)
  );
  return costRows.length >= 3 && costRows.length <= 8;
}

function isShareComposition(categories: SmartChartCategoryRow[]): boolean {
  if (categories.length < 2 || categories.length > 8) return false;
  return categories.every(
    (c) =>
      c.unit === "percent" ||
      c.unit === "ratio_0_1" ||
      c.group === "渠道类" ||
      /占比|结构|渠道|份额/.test(c.label)
  );
}

function make(
  chartType: SmartChartType,
  reasons: SmartChartReason[],
  labelZh: string,
  extra?: Partial<SmartChartRecommendation>
): SmartChartRecommendation {
  return { chartType, reasons, labelZh, ...extra };
}

const RENDERER_BY_TYPE: Partial<Record<SmartChartType, SmartChartRecommendation["rendererHint"]>> = {
  line: "CockpitTrendChart",
  line_dual: "FinancialTrendChart",
  kpi_card: "MetricCard",
  table: "Table",
  waterfall: "WaterfallChart",
  bar_horizontal: "Table",
  stacked_bar: "Table",
  progress: "MetricCard"
};

const FINANCIAL_METRIC_MAP: Partial<
  Record<SmartChartMetric, SmartChartRecommendation["financialMetric"]>
> = {
  revenue: "收入",
  cost: "成本",
  profit: "利润",
  occupancy: "出租率",
  adr: "ADR",
  revpar: "RevPAR"
};

export function recommendSmartChart(input: SmartChartInput): SmartChartRecommendation {
  const categories = input.categories ?? [];
  const series = input.series ?? [];
  const count = itemCount(input);

  if (isEmptyInput(input)) {
    return make("empty", ["insufficient_data"], "暂无可用数据，无法推荐图表");
  }

  const forbidden = findForbiddenMetrics(input.module, input.metrics);
  if (forbidden.length > 0) {
    return make(
      "none",
      ["module_metric_forbidden"],
      `当前模块（${input.module}）不推荐图表展示指标：${forbidden.join("、")}`,
      { warnings: [`forbidden: ${forbidden.join(",")}`] }
    );
  }

  if (
    input.periodCount === 1 &&
    input.layoutIntent === "kpi" &&
    count > 0 &&
    count <= 6
  ) {
    return make(
      "kpi_card",
      ["single_period_kpi"],
      "单期核心指标，推荐使用 KPI 卡片",
      { rendererHint: RENDERER_BY_TYPE.kpi_card }
    );
  }

  if (input.periodCount >= 2 && seriesHasRevenueCostProfit(series)) {
    return make(
      "line",
      ["multi_period_trend"],
      "多期收入、成本、利润数据，推荐使用折线图",
      { rendererHint: RENDERER_BY_TYPE.line }
    );
  }

  if (
    input.periodCount >= 2 &&
    input.hasBudget &&
    input.metrics?.length === 1 &&
    series.length >= 2
  ) {
    const metric = input.metrics[0]!;
    return make(
      "line_dual",
      ["actual_vs_budget_trend"],
      "多期实际与预算对比，推荐使用双折线图",
      {
        rendererHint: RENDERER_BY_TYPE.line_dual,
        financialMetric: FINANCIAL_METRIC_MAP[metric]
      }
    );
  }

  if (categories.length > 8) {
    return make(
      "table",
      ["too_many_categories"],
      "科目或明细超过 8 项，推荐使用表格",
      { rendererHint: RENDERER_BY_TYPE.table }
    );
  }

  if (input.periodCount === 1 && hasBridgeRole(categories)) {
    return make(
      "waterfall",
      ["profit_bridge"],
      "利润桥加减项结构，推荐使用瀑布图",
      { rendererHint: RENDERER_BY_TYPE.waterfall }
    );
  }

  if (input.periodCount === 1 && isCostStructure(categories)) {
    return make(
      "bar_horizontal",
      ["single_period_cost_structure"],
      "单期成本结构（3–8 项），推荐使用横向柱状图",
      { rendererHint: RENDERER_BY_TYPE.bar_horizontal }
    );
  }

  if (input.periodCount === 1 && isShareComposition(categories)) {
    const chartType: SmartChartType =
      categories.length <= 4 ? "progress" : "stacked_bar";
    return make(
      chartType,
      ["share_of_total"],
      chartType === "progress"
        ? "占比类指标较少，推荐使用进度条"
        : "占比/渠道结构，推荐使用堆叠条形图",
      { rendererHint: RENDERER_BY_TYPE[chartType] }
    );
  }

  if (categories.length > 0) {
    return make(
      "table",
      ["ambiguous_shape"],
      "类目结构较复杂，默认推荐使用表格",
      { rendererHint: RENDERER_BY_TYPE.table }
    );
  }

  return make(
    "none",
    ["ambiguous_shape"],
    "数据形态不明确，暂不推荐图表（可改用表格或 KPI 卡片）"
  );
}
