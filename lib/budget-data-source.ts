import type { BudgetScopeMode } from "@/lib/budget-scope";
import type { BudgetSourceMode } from "@/lib/budget-resolve";
import { formatReportPeriodLabel } from "@/lib/actual-data-source";
import type { ReportPeriod } from "@/lib/mock-analytics";

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
    return "预算：演示或本地预算数据（未连接预算库）";
  }
  if (state.loading) {
    return "预算：加载中";
  }
  if (state.scopeMode === "invalid") {
    return `预算：当前范围无效。${state.invalidReason ?? ""}`;
  }
  if (state.queryError) {
    return `预算：查询暂不可用，已使用演示预算`;
  }
  if (state.useDbBudget) {
    return "预算：真实预算数据";
  }
  if (state.budgetSource === "localStorage") {
    return "预算：本机已保存的预算草稿";
  }
  return "预算：演示预算数据";
}

export function resolveBudgetBannerTone(state: BudgetDataHintState): BudgetBannerTone {
  if (!state.hasSupabaseEnv) return "demo";
  if (state.loading) return "loading";
  if (state.scopeMode === "invalid") return "hidden";
  if (state.useDbBudget) return "real";
  return "demo";
}

export function budgetBannerBadgeLabel(tone: BudgetBannerTone): string {
  if (tone === "loading") return "加载中";
  if (tone === "real") return "真实预算数据";
  return "演示数据";
}

export function buildBudgetBannerDisplay(
  state: BudgetDataHintState,
  reportPeriod: ReportPeriod,
  scopeDescription: string
): BudgetBannerDisplay | null {
  const tone = resolveBudgetBannerTone(state);
  const periodLabel = formatReportPeriodLabel(reportPeriod);
  const meta = `账期：${periodLabel} · 范围：${scopeDescription}`;

  if (tone === "hidden") {
    return {
      badge: "演示数据",
      meta,
      hint: `当前筛选范围无效，未加载预算数据。${state.invalidReason ?? ""}`.trim()
    };
  }

  if (tone === "loading") {
    return { badge: "加载中", meta };
  }

  if (tone === "real") {
    return { badge: "真实预算数据", meta };
  }

  if (!state.hasSupabaseEnv) {
    return {
      badge: "演示数据",
      meta,
      hint: "系统未连接预算库，当前为演示或本机保存的预算"
    };
  }

  if (state.budgetSource === "localStorage") {
    return {
      badge: "演示数据",
      meta,
      hint: "本账期无库内预算目标，当前使用本机已保存的预算草稿"
    };
  }

  if (state.queryError) {
    return {
      badge: "演示数据",
      meta,
      hint: "库内查询暂不可用，当前为演示预算"
    };
  }

  return {
    badge: "演示数据",
    meta,
    hint: "本账期在所选范围内暂无已录入的预算目标"
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
