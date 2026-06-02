import type { ReportPeriod } from "@/lib/mock-analytics";

export const LOCAL_STORAGE_ACTUAL_KEY = "fengtin_actual_overrides_v1";

export type ActualFinancialKey =
  | "营业收入"
  | "客房收入"
  | "餐饮收入"
  | "其他收入"
  | "人力成本"
  | "能源费用"
  | "华住管理费"
  | "客房服务成本"
  | "非客房服务成本"
  | "原材料成本"
  | "营业利润";

export type ActualHotelKey =
  | "可售间夜数"
  | "已售间数"
  | "出租率"
  | "平均房价"
  | "RevPAR"
  | "客房收入";

export type ActualOverrideValues = Partial<Record<ActualFinancialKey | ActualHotelKey, number>>;
export type ActualOverrideMap = Record<string, ActualOverrideValues>;

export function buildActualStorageKey(scope: string, period: ReportPeriod): string {
  const suffix =
    period.粒度 === "month"
      ? `m${period.月 ?? 1}`
      : period.粒度 === "quarter"
        ? `q${period.季 ?? 1}`
        : "y";
  return `${scope}|${period.粒度}|${period.年}|${suffix}`;
}
