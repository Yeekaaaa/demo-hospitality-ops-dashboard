import type { BudgetScopeMode } from "@/lib/budget-scope";
import type { BudgetSourceMode } from "@/lib/budget-resolve";
import { formatReportPeriodLabel } from "@/lib/actual-data-source";
import type { ReportPeriod } from "@/lib/mock-analytics";
import { t } from "@/lib/i18n/get-message";

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
export function buildBudgetDataSourceMessage(state: BudgetDataHintState): string {
  if (!state.hasSupabaseEnv) {
    return t("banner.budget.deprecatedNoEnv");
  }
  if (state.loading) {
    return t("banner.budget.deprecatedLoading");
  }
  if (state.scopeMode === "invalid") {
    return t("banner.budget.deprecatedInvalid", {
      reason: state.invalidReason ?? ""
    });
  }
  if (state.queryError) {
    return t("banner.budget.deprecatedQueryError");
  }
  if (state.useDbBudget) {
    return t("banner.budget.deprecatedReal");
  }
  if (state.budgetSource === "localStorage") {
    return t("banner.budget.deprecatedLocalDraft");
  }
  return t("banner.budget.deprecatedDemo");
}

export function resolveBudgetBannerTone(state: BudgetDataHintState): BudgetBannerTone {
  if (!state.hasSupabaseEnv) return "demo";
  if (state.loading) return "loading";
  if (state.scopeMode === "invalid") return "hidden";
  if (state.useDbBudget) return "real";
  return "demo";
}

export function budgetBannerBadgeLabel(tone: BudgetBannerTone): string {
  if (tone === "loading") return t("banner.budget.loading");
  if (tone === "real") return t("banner.budget.real");
  return t("banner.budget.demo");
}

export function buildBudgetBannerDisplay(
  state: BudgetDataHintState,
  reportPeriod: ReportPeriod,
  scopeDescription: string
): BudgetBannerDisplay | null {
  const tone = resolveBudgetBannerTone(state);
  const periodLabel = formatReportPeriodLabel(reportPeriod);
  const meta = t("banner.actual.periodScope", {
    period: periodLabel,
    scope: scopeDescription
  });

  if (tone === "hidden") {
    return {
      badge: t("banner.budget.demo"),
      meta,
      hint: t("banner.budget.invalidScopeHint", {
        reason: state.invalidReason ?? ""
      }).trim()
    };
  }

  if (tone === "loading") {
    return { badge: t("banner.budget.loading"), meta };
  }

  if (tone === "real") {
    return { badge: t("banner.budget.real"), meta };
  }

  if (!state.hasSupabaseEnv) {
    return {
      badge: t("banner.budget.demo"),
      meta,
      hint: t("banner.budget.noEnvHint")
    };
  }

  if (state.budgetSource === "localStorage") {
    return {
      badge: t("banner.budget.demo"),
      meta,
      hint: t("banner.budget.localDraftHint")
    };
  }

  if (state.queryError) {
    return {
      badge: t("banner.budget.demo"),
      meta,
      hint: t("banner.budget.queryErrorHint")
    };
  }

  return {
    badge: t("banner.budget.demo"),
    meta,
    hint: t("banner.budget.noTargetHint")
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
