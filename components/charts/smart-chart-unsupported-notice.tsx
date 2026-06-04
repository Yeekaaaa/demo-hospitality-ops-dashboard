"use client";

import { chartTypeLabelZh } from "@/lib/smart-chart/display-labels";
import { useLocale } from "@/lib/i18n/locale-context";
import type { SmartChartType } from "@/lib/smart-chart/types";

type SmartChartUnsupportedNoticeProps = {
  chartType: SmartChartType;
  messageZh?: string;
};

export function SmartChartUnsupportedNotice({
  chartType,
  messageZh
}: SmartChartUnsupportedNoticeProps) {
  const { locale, t } = useLocale();
  const chartLabel = chartTypeLabelZh(chartType, locale);
  const text =
    messageZh ?? t("smartChart.unsupported", { chartType: chartLabel });

  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-950"
      role="status"
    >
      {text}
    </div>
  );
}
