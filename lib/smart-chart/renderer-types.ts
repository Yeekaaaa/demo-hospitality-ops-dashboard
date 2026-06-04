import type {
  SmartChartCategoryRow,
  SmartChartPoint,
  SmartChartRecommendation,
  SmartChartRendererHint,
  SmartChartType
} from "@/lib/smart-chart/types";

export type SmartChartRenderMode = "recommendation_only" | "preview" | "replace";

export type SmartChartLineVariant = "cockpit" | "simple";

export type SmartChartRendererFallback =
  | "legacy_children"
  | "table"
  | "empty"
  | "message_only";

export type SmartChartFinancialTrendMode = "实际对比预算" | "收入成本利润";

export type SmartChartFinancialTrendMetric =
  | "收入"
  | "成本"
  | "利润"
  | "出租率"
  | "RevPAR"
  | "ADR";

/** 标准化渲染载荷（由页面 adapter + transforms 组装，Renderer 阶段消费） */
export type SmartChartRendererPayload = {
  series?: SmartChartPoint[];
  categories?: SmartChartCategoryRow[];
  financial?: {
    rows: Array<Record<string, unknown>>;
    mode: SmartChartFinancialTrendMode;
    metric: SmartChartFinancialTrendMetric;
  };
  lineVariant?: SmartChartLineVariant;
};

export type SmartChartRendererPlan = {
  supported: boolean;
  chartType: SmartChartType;
  rendererHint?: SmartChartRendererHint;
  fallback: SmartChartRendererFallback;
  messageZh: string;
  warnings?: string[];
};

export type SmartChartRendererDataAdapter = (
  input: import("@/lib/smart-chart/types").SmartChartInput
) => SmartChartRendererPayload;

export type ResolveSmartChartRendererOptions = {
  /** 未接入 chartType 的 fallback（默认 message_only） */
  unsupportedFallback?: Extract<SmartChartRendererFallback, "message_only" | "table">;
};

export type { SmartChartRecommendation };
