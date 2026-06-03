/**
 * 实际数据来源提示（库内经营实际 vs 演示/mock）
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import { toDbPeriod } from "@/lib/data-caliber";

export type ActualDataSourceMode = "supabase" | "mock_fallback" | "mock_only";

export type ActualBannerTone = "loading" | "real" | "demo";

export function resolveActualDataSourceMode(
  hasSupabaseEnv: boolean,
  useDbActual: boolean
): ActualDataSourceMode {
  if (!hasSupabaseEnv) return "mock_only";
  return useDbActual ? "supabase" : "mock_fallback";
}

/** @deprecated 技术向标签；页面展示请用 buildActualBannerLine */
export function actualDataSourceLabel(mode: ActualDataSourceMode): string {
  if (mode === "supabase") return "Supabase actual_data";
  if (mode === "mock_fallback") {
    return "Mock demo data（已配置 Supabase，当前门店范围/账期无 actual_data 行）";
  }
  return "Mock demo data（未配置 Supabase 环境变量）";
}

/** @deprecated 技术向；页面展示请用 formatReportPeriodLabel */
export function formatActualDataPeriodHint(reportPeriod: ReportPeriod): string {
  const { period_type, period_value } = toDbPeriod(reportPeriod);
  return `period_type=${period_type} · period_value=${period_value}`;
}

/** 用户可见账期（月度为 YYYY-MM） */
export function formatReportPeriodLabel(reportPeriod: ReportPeriod): string {
  return toDbPeriod(reportPeriod).period_value;
}

export function resolveActualBannerTone(params: {
  hasSupabaseEnv: boolean;
  loading: boolean;
  useDbActual: boolean;
  forceDemo?: boolean;
}): ActualBannerTone {
  if (params.forceDemo) return "demo";
  if (params.loading && params.hasSupabaseEnv) return "loading";
  if (!params.hasSupabaseEnv) return "demo";
  return params.useDbActual ? "real" : "demo";
}

export function buildActualBannerLine(params: {
  tone: ActualBannerTone;
  periodLabel: string;
  scopeDescription: string;
  forceDemo?: boolean;
  hasSupabaseEnv?: boolean;
  /** 与预算同行展示时使用短文案，并配合「实际：」前缀 */
  compact?: boolean;
}): string {
  const { tone, periodLabel, scopeDescription, forceDemo, hasSupabaseEnv, compact } = params;

  if (forceDemo) {
    return `餐饮模块当前为演示数据（尚未对接经营实际导入）· 当前账期：${periodLabel} · 范围：${scopeDescription}`;
  }

  if (tone === "loading") {
    return `正在加载 ${periodLabel} 经营数据… · 范围：${scopeDescription}`;
  }

  if (tone === "real") {
    if (compact) {
      return `真实经营数据 · 账期 ${periodLabel} · 范围：${scopeDescription}`;
    }
    return `当前展示真实经营数据 · 账期 ${periodLabel} · 范围：${scopeDescription}`;
  }

  if (hasSupabaseEnv === false) {
    return `当前为演示数据 · 系统尚未连接经营数据库，页面数字仅供界面预览。配置并导入经营数据后可查看真实结果。范围：${scopeDescription}`;
  }

  return `当前为演示数据 · 账期 ${periodLabel} 在所选范围内暂无已导入的经营实际数据，页面数字仅供界面预览，请勿作为决策依据。请到「经营数据模板」导入后再查看。范围：${scopeDescription}`;
}

export function actualBannerUsesDemoTone(tone: ActualBannerTone, hasSupabaseEnv: boolean): boolean {
  if (tone === "demo") return true;
  if (tone === "loading") return false;
  return tone === "real" ? false : !hasSupabaseEnv;
}
