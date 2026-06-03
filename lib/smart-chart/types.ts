/** 展示单位语义（数值仍为元口径；万元展示由 formatWan 负责） */
export type ChartUnit = "yuan" | "wan_display" | "percent" | "count" | "currency_per_unit" | "ratio_0_1";

export type SmartChartType =
  | "kpi_card"
  | "line"
  | "line_dual"
  | "bar_horizontal"
  | "stacked_bar"
  | "waterfall"
  | "progress"
  | "table"
  | "empty"
  | "none";

export type SmartChartReason =
  | "single_period_kpi"
  | "multi_period_trend"
  | "actual_vs_budget_trend"
  | "single_period_cost_structure"
  | "profit_bridge"
  | "share_of_total"
  | "too_many_categories"
  | "module_metric_forbidden"
  | "insufficient_data"
  | "ambiguous_shape";

export type SmartChartModule = "dashboard" | "hotel" | "restaurant" | "financial" | "budget";

export type SmartChartPoint = {
  period: string;
  actual?: number | null;
  budget?: number | null;
  revenue?: number | null;
  cost?: number | null;
  profit?: number | null;
};

export type SmartChartCategoryRow = {
  id: string;
  label: string;
  actual: number;
  budget?: number;
  unit: ChartUnit;
  group?: string;
  bridgeRole?: "start" | "delta" | "subtotal" | "total";
};

export type SmartChartMetric =
  | "revenue"
  | "cost"
  | "profit"
  | "margin"
  | "occupancy"
  | "adr"
  | "revpar"
  | "rooms_sold"
  | "rooms_available"
  | "room_revenue"
  | "customer_spend"
  | "waste_rate"
  | "gross_margin"
  | "custom";

export type SmartChartLayoutIntent = "kpi" | "trend" | "composition" | "bridge" | "comparison";

export type SmartChartInput = {
  module: SmartChartModule;
  periodCount: number;
  categories?: SmartChartCategoryRow[];
  series?: SmartChartPoint[];
  metrics?: SmartChartMetric[];
  hasBudget?: boolean;
  unitDefault?: ChartUnit;
  layoutIntent?: SmartChartLayoutIntent;
  locale?: "zh-CN";
};

export type SmartChartRendererHint =
  | "TrendChart"
  | "CockpitTrendChart"
  | "FinancialTrendChart"
  | "MetricCard"
  | "Table"
  | "WaterfallChart";

export type SmartChartRecommendation = {
  chartType: SmartChartType;
  reasons: SmartChartReason[];
  labelZh: string;
  rendererHint?: SmartChartRendererHint;
  financialMetric?: "收入" | "成本" | "利润" | "出租率" | "RevPAR" | "ADR";
  warnings?: string[];
};
