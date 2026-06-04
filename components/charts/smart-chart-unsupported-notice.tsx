"use client";

import { chartTypeLabelZh } from "@/lib/smart-chart/display-labels";
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
    messageZh ??
    `系统推荐${chartLabel}，该推荐图表暂未接入自动渲染，当前可继续查看页面原有图表或表格。`;

  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-950"
      role="status"
    >
      {text}
    </div>
  );
}
