/**
 * 实际数据来源提示（Supabase actual_data vs mock）
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import { toDbPeriod } from "@/lib/data-caliber";

export type ActualDataSourceMode = "supabase" | "mock_fallback" | "mock_only";

export function resolveActualDataSourceMode(
  hasSupabaseEnv: boolean,
  useDbActual: boolean
): ActualDataSourceMode {
  if (!hasSupabaseEnv) return "mock_only";
  return useDbActual ? "supabase" : "mock_fallback";
}

export function actualDataSourceLabel(mode: ActualDataSourceMode): string {
  if (mode === "supabase") return "Supabase actual_data";
  if (mode === "mock_fallback") {
    return "Mock demo data（已配置 Supabase，当前门店范围/账期无 actual_data 行）";
  }
  return "Mock demo data（未配置 Supabase 环境变量）";
}

export function formatActualDataPeriodHint(reportPeriod: ReportPeriod): string {
  const { period_type, period_value } = toDbPeriod(reportPeriod);
  return `period_type=${period_type} · period_value=${period_value}`;
}
