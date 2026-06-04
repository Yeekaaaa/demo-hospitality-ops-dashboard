import { chartTypeLabelZh } from "@/lib/smart-chart/display-labels";
import { t } from "@/lib/i18n/get-message";
import type {
  ResolveSmartChartRendererOptions,
  SmartChartRendererPayload,
  SmartChartRendererPlan
} from "@/lib/smart-chart/renderer-types";
import type {
  SmartChartRecommendation,
  SmartChartRendererHint,
  SmartChartType
} from "@/lib/smart-chart/types";

const UNSUPPORTED_CHART_TYPES = new Set<SmartChartType>([
  "waterfall",
  "bar_horizontal",
  "stacked_bar",
  "progress",
  "kpi_card"
]);

function unsupportedMessage(chartType: SmartChartType): string {
  const label = chartTypeLabelZh(chartType);
  return t("smartChart.unsupportedPlan", { chartType: label });
}

function lineRendererHint(payload: SmartChartRendererPayload): SmartChartRendererHint {
  if (payload.lineVariant === "simple") return "TrendChart";
  return "CockpitTrendChart";
}

function plan(
  partial: SmartChartRendererPlan & { chartType: SmartChartType }
): SmartChartRendererPlan {
  return partial;
}

/**
 * 根据推荐结果与标准化 payload 解析渲染计划（不 throw）
 */
export function resolveSmartChartRendererPlan(
  recommendation: SmartChartRecommendation,
  payload: SmartChartRendererPayload,
  options?: ResolveSmartChartRendererOptions
): SmartChartRendererPlan {
  const { chartType } = recommendation;
  const unsupportedFallback = options?.unsupportedFallback ?? "message_only";

  if (chartType === "empty") {
    return plan({
      supported: true,
      chartType,
      fallback: "empty",
      messageZh: recommendation.labelZh
    });
  }

  if (chartType === "none") {
    return plan({
      supported: true,
      chartType,
      fallback: "message_only",
      messageZh: recommendation.labelZh
    });
  }

  if (chartType === "table") {
    return plan({
      supported: true,
      chartType,
      rendererHint: "Table",
      fallback: "table",
      messageZh: recommendation.labelZh
    });
  }

  if (chartType === "line") {
    const hint = lineRendererHint(payload);
    const hasSeries = (payload.series?.length ?? 0) > 0;
    return plan({
      supported: true,
      chartType,
      rendererHint: hint,
      fallback: "empty",
      messageZh: recommendation.labelZh,
      warnings: hasSeries ? undefined : ["line_series_empty"]
    });
  }

  if (chartType === "line_dual") {
    const rows = payload.financial?.rows;
    const hasFinancial =
      Array.isArray(rows) &&
      rows.length > 0 &&
      typeof payload.financial?.mode === "string" &&
      typeof payload.financial?.metric === "string";

    if (hasFinancial) {
      return plan({
        supported: true,
        chartType,
        rendererHint: "FinancialTrendChart",
        fallback: "message_only",
        messageZh: recommendation.labelZh
      });
    }

    return plan({
      supported: false,
      chartType,
      fallback: "message_only",
      messageZh: t("smartChart.financialPayloadMissing"),
      warnings: ["financial_payload_missing"]
    });
  }

  if (UNSUPPORTED_CHART_TYPES.has(chartType)) {
    return plan({
      supported: false,
      chartType,
      rendererHint: recommendation.rendererHint,
      fallback: unsupportedFallback,
      messageZh: unsupportedMessage(chartType),
      warnings: recommendation.warnings
    });
  }

  return plan({
    supported: false,
    chartType,
    rendererHint: recommendation.rendererHint,
    fallback: "message_only",
    messageZh: recommendation.labelZh || t("smartChart.unknownChartType"),
    warnings: ["unknown_chart_type"]
  });
}
