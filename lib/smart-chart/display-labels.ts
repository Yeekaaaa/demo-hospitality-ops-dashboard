import type { SmartChartReason, SmartChartType } from "@/lib/smart-chart/types";

const CHART_TYPE_ZH: Record<SmartChartType, string> = {
  line: "折线图",
  line_dual: "实际 vs 预算折线图",
  kpi_card: "KPI 卡片",
  bar_horizontal: "横向柱状图",
  stacked_bar: "堆叠条形图",
  progress: "进度条",
  waterfall: "瀑布图",
  table: "表格",
  empty: "暂无推荐",
  none: "暂无推荐"
};

const REASON_ZH: Record<SmartChartReason, string> = {
  multi_period_trend: "当前为多期经营趋势，适合用折线图观察变化",
  actual_vs_budget_trend: "当前包含实际与预算，适合用双线趋势对比",
  single_period_kpi: "当前为单期核心指标，适合用 KPI 卡片展示",
  insufficient_data: "当前数据不足，暂不推荐图表",
  single_period_cost_structure: "当前为单期成本结构，适合用横向柱状图对比",
  profit_bridge: "当前为利润桥结构，适合用瀑布图展示增减",
  share_of_total: "当前为占比类指标，适合用堆叠图或进度条展示",
  too_many_categories: "明细项较多，更适合用表格查看",
  module_metric_forbidden: "当前模块不适合用该指标做图表展示",
  ambiguous_shape: "数据形态较复杂，建议先用表格查看"
};

export function chartTypeLabelZh(chartType: SmartChartType): string {
  return CHART_TYPE_ZH[chartType];
}

export function reasonLabelZh(reason: SmartChartReason): string {
  return REASON_ZH[reason];
}

/** 取首要原因文案；无映射时返回空字符串 */
export function primaryReasonText(reasons: SmartChartReason[]): string {
  if (reasons.length === 0) return "";
  return reasonLabelZh(reasons[0]!);
}
