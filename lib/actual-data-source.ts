/**
 * 实际数据来源提示（库内经营实际 vs 演示/mock）
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import { toDbPeriod } from "@/lib/data-caliber";
import { t } from "@/lib/i18n/get-message";

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
  if (mode === "supabase") return t("banner.actual.real");
  if (mode === "mock_fallback") {
    return t("banner.actualDeprecated.demoFallbackLong");
  }
  return t("banner.actualDeprecated.demoNoEnvLong");
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
  if (forceDemo) return t("banner.actual.demo");
  if (tone === "loading") return t("banner.actual.loading");
  if (tone === "real") return t("banner.actual.real");
  return t("banner.actual.demo");
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
  const meta = t("banner.actual.periodScope", {
    period: periodLabel,
    scope: scopeDescription
  });

  if (tone === "loading") {
    return { badge: t("banner.actual.loading"), meta };
  }

  if (tone === "real") {
    return {
      badge: t("banner.actual.real"),
      meta,
      hint: compact ? undefined : t("banner.actual.realHint")
    };
  }

  if (forceDemo) {
    return {
      badge: t("banner.actual.demo"),
      meta,
      hint: t("banner.actual.demoForceHint")
    };
  }

  if (hasSupabaseEnv === false) {
    return {
      badge: t("banner.actual.demo"),
      meta,
      hint: t("banner.actual.demoNoEnvHint")
    };
  }

  return {
    badge: t("banner.actual.demo"),
    meta,
    hint: t("banner.actual.demoNoRowsHint")
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
