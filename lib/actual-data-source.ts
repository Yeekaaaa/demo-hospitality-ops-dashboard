/**
 * 实际数据来源提示（库内经营实际 vs 演示/mock）
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import { toDbPeriod } from "@/lib/data-caliber";
import { getMessage } from "@/lib/i18n/get-message";
import type { Locale, MessageParams } from "@/lib/i18n/types";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";

function m(key: string, params?: MessageParams, locale: Locale = DEFAULT_LOCALE): string {
  return getMessage(locale, key, params);
}

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
export function actualDataSourceLabel(
  mode: ActualDataSourceMode,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (mode === "supabase") return m("banner.actual.real", undefined, locale);
  if (mode === "mock_fallback") {
    return m("banner.actualDeprecated.demoFallbackLong", undefined, locale);
  }
  return m("banner.actualDeprecated.demoNoEnvLong", undefined, locale);
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
  forceDemo?: boolean,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (forceDemo) return m("banner.actual.demo", undefined, locale);
  if (tone === "loading") return m("banner.actual.loading", undefined, locale);
  if (tone === "real") return m("banner.actual.real", undefined, locale);
  return m("banner.actual.demo", undefined, locale);
}

export function buildActualBannerDisplay(params: {
  tone: ActualBannerTone;
  periodLabel: string;
  scopeDescription: string;
  forceDemo?: boolean;
  hasSupabaseEnv?: boolean;
  compact?: boolean;
  locale?: Locale;
}): ActualBannerDisplay {
  const {
    tone,
    periodLabel,
    scopeDescription,
    forceDemo,
    hasSupabaseEnv,
    compact,
    locale = DEFAULT_LOCALE
  } = params;
  const meta = m(
    "banner.actual.periodScope",
    {
      period: periodLabel,
      scope: scopeDescription
    },
    locale
  );

  if (tone === "loading") {
    return { badge: m("banner.actual.loading", undefined, locale), meta };
  }

  if (tone === "real") {
    return {
      badge: m("banner.actual.real", undefined, locale),
      meta,
      hint: compact ? undefined : m("banner.actual.realHint", undefined, locale)
    };
  }

  if (forceDemo) {
    return {
      badge: m("banner.actual.demo", undefined, locale),
      meta,
      hint: m("banner.actual.demoForceHint", undefined, locale)
    };
  }

  if (hasSupabaseEnv === false) {
    return {
      badge: m("banner.actual.demo", undefined, locale),
      meta,
      hint: m("banner.actual.demoNoEnvHint", undefined, locale)
    };
  }

  return {
    badge: m("banner.actual.demo", undefined, locale),
    meta,
    hint: m("banner.actual.demoNoRowsHint", undefined, locale)
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
