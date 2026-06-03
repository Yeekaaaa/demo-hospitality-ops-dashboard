/**
 * 实际数据来源提示（库内经营实际 vs 演示/mock）
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import { toDbPeriod } from "@/lib/data-caliber";

export type ActualDataSourceMode = "supabase" | "mock_fallback" | "mock_only";

export type ActualBannerTone = "loading" | "real" | "demo";

export type ActualBannerDisplay = {
  badge: string;
  /** 账期：YYYY-MM · 范围：… */
  meta: string;
  hint?: string;
};

export function resolveActualDataSourceMode(
  hasSupabaseEnv: boolean,
  useDbActual: boolean
): ActualDataSourceMode {
  if (!hasSupabaseEnv) return "mock_only";
  return useDbActual ? "supabase" : "mock_fallback";
}

/** @deprecated 技术向标签；页面展示请用 actualBannerBadgeLabel / buildActualBannerDisplay */
export function actualDataSourceLabel(mode: ActualDataSourceMode): string {
  if (mode === "supabase") return "真实经营数据";
  if (mode === "mock_fallback") {
    return "演示数据（该账期暂无已导入的经营数据）";
  }
  return "演示数据（未连接经营数据库）";
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

export function actualBannerBadgeLabel(
  tone: ActualBannerTone,
  forceDemo?: boolean
): string {
  if (forceDemo) return "演示数据";
  if (tone === "loading") return "加载中";
  if (tone === "real") return "真实经营数据";
  return "演示数据";
}

export function buildActualBannerDisplay(params: {
  tone: ActualBannerTone;
  periodLabel: string;
  scopeDescription: string;
  forceDemo?: boolean;
  hasSupabaseEnv?: boolean;
  compact?: boolean;
}): ActualBannerDisplay {
  const { tone, periodLabel, scopeDescription, forceDemo, hasSupabaseEnv, compact } = params;
  const meta = `账期：${periodLabel} · 范围：${scopeDescription}`;

  if (tone === "loading") {
    return { badge: "加载中", meta };
  }

  if (tone === "real") {
    return {
      badge: "真实经营数据",
      meta,
      hint: compact ? undefined : "当前展示已导入的经营数据"
    };
  }

  if (forceDemo) {
    return {
      badge: "演示数据",
      meta,
      hint: "该模块尚未接入经营导入，当前数字仅用于界面预览"
    };
  }

  if (hasSupabaseEnv === false) {
    return {
      badge: "演示数据",
      meta,
      hint: "系统尚未连接经营数据库，导入后可查看真实经营数据"
    };
  }

  return {
    badge: "演示数据",
    meta,
    hint: "该账期暂无真实经营数据，当前数字仅用于界面预览，请勿作为经营决策依据"
  };
}

/** @deprecated 页面展示请用 buildActualBannerDisplay */
export function buildActualBannerLine(params: {
  tone: ActualBannerTone;
  periodLabel: string;
  scopeDescription: string;
  forceDemo?: boolean;
  hasSupabaseEnv?: boolean;
  compact?: boolean;
}): string {
  const { badge, meta, hint } = buildActualBannerDisplay(params);
  return hint ? `${badge} · ${meta} · ${hint}` : `${badge} · ${meta}`;
}

export function actualBannerUsesDemoTone(tone: ActualBannerTone, hasSupabaseEnv: boolean): boolean {
  if (tone === "demo") return true;
  if (tone === "loading") return false;
  return tone === "real" ? false : !hasSupabaseEnv;
}
