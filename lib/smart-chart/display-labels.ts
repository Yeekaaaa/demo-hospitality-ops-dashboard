import { t } from "@/lib/i18n/get-message";
import type { SmartChartReason, SmartChartType } from "@/lib/smart-chart/types";

export function chartTypeLabelZh(chartType: SmartChartType): string {
  return t(`smartChart.chartType.${chartType}`);
}

export function reasonLabelZh(reason: SmartChartReason): string {
  return t(`smartChart.reason.${reason}`);
}

/** 取首要原因文案；无映射时返回空字符串 */
export function primaryReasonText(reasons: SmartChartReason[]): string {
  if (reasons.length === 0) return "";
  return reasonLabelZh(reasons[0]!);
}
