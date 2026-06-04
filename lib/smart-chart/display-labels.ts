import { getMessage } from "@/lib/i18n/get-message";
import type { Locale } from "@/lib/i18n/types";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";
import type { SmartChartReason, SmartChartType } from "@/lib/smart-chart/types";

export function chartTypeLabelZh(
  chartType: SmartChartType,
  locale: Locale = DEFAULT_LOCALE
): string {
  return getMessage(locale, `smartChart.chartType.${chartType}`);
}

export function reasonLabelZh(
  reason: SmartChartReason,
  locale: Locale = DEFAULT_LOCALE
): string {
  return getMessage(locale, `smartChart.reason.${reason}`);
}

/** 取首要原因文案；无映射时返回空字符串 */
export function primaryReasonText(
  reasons: SmartChartReason[],
  locale: Locale = DEFAULT_LOCALE
): string {
  if (reasons.length === 0) return "";
  return reasonLabelZh(reasons[0]!, locale);
}
