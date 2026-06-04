"use client";

import { chartTypeLabelZh } from "@/lib/smart-chart/display-labels";
import { t } from "@/lib/i18n/get-message";
import type { SmartChartType } from "@/lib/smart-chart/types";

type SmartChartUnsupportedNoticeProps = {
  chartType: SmartChartType;
  messageZh?: string;
};

export function SmartChartUnsupportedNotice({
  chartType,
  messageZh
}: SmartChartUnsupportedNoticeProps) {
  const chartLabel = chartTypeLabelZh(chartType);
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
