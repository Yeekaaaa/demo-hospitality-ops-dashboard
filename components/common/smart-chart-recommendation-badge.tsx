"use client";

import {
  chartTypeLabelZh,
  primaryReasonText
} from "@/lib/smart-chart/display-labels";
import type { SmartChartRecommendation } from "@/lib/smart-chart/types";

export function SmartChartRecommendationBadge({
  recommendation
}: {
  recommendation: SmartChartRecommendation;
}) {
  if (recommendation.chartType === "empty") {
    return (
      <p className="text-sm text-muted-foreground">暂无足够数据推荐图表。</p>
    );
  }

  const chartLabel = chartTypeLabelZh(recommendation.chartType);
  const reasonText = primaryReasonText(recommendation.reasons);

  return (
    <div
      className="rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm text-slate-800"
      role="status"
      aria-live="polite"
    >
      <p>
        <span className="text-muted-foreground">推荐图表：</span>
        <span className="font-medium text-slate-900">{chartLabel}</span>
      </p>
      {reasonText ? (
        <p className="mt-1 text-muted-foreground">
          <span className="text-muted-foreground">原因：</span>
          {reasonText}
        </p>
      ) : null}
    </div>
  );
}
