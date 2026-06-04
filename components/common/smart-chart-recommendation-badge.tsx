"use client";

import {
  chartTypeLabelZh,
  primaryReasonText
} from "@/lib/smart-chart/display-labels";
import { t } from "@/lib/i18n/get-message";
import type { SmartChartRecommendation } from "@/lib/smart-chart/types";

export function SmartChartRecommendationBadge({
  recommendation
}: {
  recommendation: SmartChartRecommendation;
}) {
  if (recommendation.chartType === "empty") {
    return (
      <p className="text-sm text-muted-foreground">{t("smartChart.emptyRecommendation")}</p>
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
        <span className="text-muted-foreground">{t("smartChart.recommendationLabel")}</span>
        <span className="font-medium text-slate-900">{chartLabel}</span>
      </p>
      {reasonText ? (
        <p className="mt-1 text-muted-foreground">
          <span className="text-muted-foreground">{t("smartChart.reasonLabel")}</span>
          {reasonText}
        </p>
      ) : null}
    </div>
  );
}
