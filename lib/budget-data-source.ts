import type { BudgetScopeMode } from "@/lib/budget-scope";
import type { BudgetSourceMode } from "@/lib/budget-resolve";
import { formatReportPeriodLabel } from "@/lib/actual-data-source";
import type { ReportPeriod } from "@/lib/mock-analytics";
import { getMessage } from "@/lib/i18n/get-message";
import type { Locale, MessageParams } from "@/lib/i18n/types";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";

function m(key: string, params?: MessageParams, locale: Locale = DEFAULT_LOCALE): string {
  return getMessage(locale, key, params);
}

export type BudgetDataHintState = {
  hasSupabaseEnv: boolean;
  loading: boolean;
  scopeMode: BudgetScopeMode;
  useDbBudget: boolean;
  budgetSource: BudgetSourceMode;
  /** 单店 UUID */
  singleStoreId: string | null;
  /** 查询错误 */
  queryError: string | null;
  /** 已查行数 */
  rowCount: number;
  invalidReason: string | null;
};

export type BudgetBannerTone = "loading" | "real" | "demo" | "hidden";

export type BudgetBannerDisplay = {
  badge: string;
  meta: string;
  hint?: string;
};

/** @deprecated 技术向；页面展示请用 buildBudgetBannerDisplay */
export function buildBudgetDataSourceMessage(
  state: BudgetDataHintState,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (!state.hasSupabaseEnv) {
    return m("banner.budget.deprecatedNoEnv", undefined, locale);
  }
  if (state.loading) {
    return m("banner.budget.deprecatedLoading", undefined, locale);
  }
  if (state.scopeMode === "invalid") {
    return m("banner.budget.deprecatedInvalid", {
      reason: state.invalidReason ?? ""
    }, locale);
  }
  if (state.queryError) {
    return m("banner.budget.deprecatedQueryError", undefined, locale);
  }
  if (state.useDbBudget) {
    return m("banner.budget.deprecatedReal", undefined, locale);
  }
  if (state.budgetSource === "localStorage") {
    return m("banner.budget.deprecatedLocalDraft", undefined, locale);
  }
  return m("banner.budget.deprecatedDemo", undefined, locale);
}

export function resolveBudgetBannerTone(state: BudgetDataHintState): BudgetBannerTone {
  if (!state.hasSupabaseEnv) return "demo";
  if (state.loading) return "loading";
  if (state.scopeMode === "invalid") return "hidden";
  if (state.useDbBudget) return "real";
  return "demo";
}

export function budgetBannerBadgeLabel(
  tone: BudgetBannerTone,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (tone === "loading") return m("banner.budget.loading", undefined, locale);
  if (tone === "real") return m("banner.budget.real", undefined, locale);
  return m("banner.budget.demo", undefined, locale);
}

export function buildBudgetBannerDisplay(
  state: BudgetDataHintState,
  reportPeriod: ReportPeriod,
  scopeDescription: string,
  locale: Locale = DEFAULT_LOCALE
): BudgetBannerDisplay | null {
  const tone = resolveBudgetBannerTone(state);
  const periodLabel = formatReportPeriodLabel(reportPeriod);
  const meta = m(
    "banner.actual.periodScope",
    {
      period: periodLabel,
      scope: scopeDescription
    },
    locale
  );

  if (tone === "hidden") {
    return {
      badge: m("banner.budget.demo", undefined, locale),
      meta,
      hint: m("banner.budget.invalidScopeHint", {
        reason: state.invalidReason ?? ""
      }, locale).trim()
    };
  }

  if (tone === "loading") {
    return { badge: m("banner.budget.loading", undefined, locale), meta };
  }

  if (tone === "real") {
    return { badge: m("banner.budget.real", undefined, locale), meta };
  }

  if (!state.hasSupabaseEnv) {
    return {
      badge: m("banner.budget.demo", undefined, locale),
      meta,
      hint: m("banner.budget.noEnvHint", undefined, locale)
    };
  }

  if (state.budgetSource === "localStorage") {
    return {
      badge: m("banner.budget.demo", undefined, locale),
      meta,
      hint: m("banner.budget.localDraftHint", undefined, locale)
    };
  }

  if (state.queryError) {
    return {
      badge: m("banner.budget.demo", undefined, locale),
      meta,
      hint: m("banner.budget.queryErrorHint", undefined, locale)
    };
  }

  return {
    badge: m("banner.budget.demo", undefined, locale),
    meta,
    hint: m("banner.budget.noTargetHint", undefined, locale)
  };
}

/** @deprecated 页面展示请用 buildBudgetBannerDisplay */
export function buildBudgetBannerLine(
  state: BudgetDataHintState,
  reportPeriod: ReportPeriod,
  scopeDescription: string
): string | null {
  const parts = buildBudgetBannerDisplay(state, reportPeriod, scopeDescription);
  if (!parts) return null;
  return parts.hint ? `${parts.badge} · ${parts.meta} · ${parts.hint}` : `${parts.badge} · ${parts.meta}`;
}

export function budgetBannerUsesDemoTone(tone: BudgetBannerTone): boolean {
  return tone === "demo";
}
