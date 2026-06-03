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

/** @deprecated 技术向；页面展示请用 buildBudgetBannerLine */
export function buildBudgetDataSourceMessage(state: BudgetDataHintState): string {
  if (!state.hasSupabaseEnv) {
    return "预算数据来源：未配置 Supabase，使用 localStorage / Mock demo";
  }
  if (state.loading) {
    return "预算数据来源：正在查询 Supabase budget_data…";
  }
  if (state.scopeMode === "invalid") {
    return `预算数据来源：scope 无效，未查询 budget_data。${state.invalidReason ?? ""}`;
  }
  if (state.queryError) {
    return `预算数据来源：Supabase 查询失败（${state.queryError}），已 fallback`;
  }
  if (state.useDbBudget) {
    const sid = state.singleStoreId ? ` store_id=${state.singleStoreId.slice(0, 8)}…` : "";
    return `预算数据来源：Supabase budget_data（${state.rowCount} 行${sid}）`;
  }
  if (state.scopeMode === "aggregate") {
    return `预算数据来源：当前为汇总 scope（${state.rowCount} 行），无 budget_data 时使用 localStorage / Mock demo`;
  }
  if (state.scopeMode === "single") {
    const sid = state.singleStoreId ?? "—";
    if (state.budgetSource === "localStorage") {
      return `预算数据来源：本账期无 budget_data 行（已查 store_id=${sid}），使用 localStorage budget_overrides`;
    }
    return `预算数据来源：本账期无 budget_data 行（已查 store_id=${sid}），且无本地预算覆盖，使用 Mock demo`;
  }
  return "预算数据来源：未知状态";
}

export function resolveBudgetBannerTone(state: BudgetDataHintState): BudgetBannerTone {
  if (!state.hasSupabaseEnv) return "demo";
  if (state.loading) return "loading";
  if (state.scopeMode === "invalid") return "hidden";
  if (state.useDbBudget) return "real";
  return "demo";
}

export function buildBudgetBannerLine(
  state: BudgetDataHintState,
  reportPeriod: ReportPeriod,
  scopeDescription: string
): string | null {
  const tone = resolveBudgetBannerTone(state);
  const periodLabel = formatReportPeriodLabel(reportPeriod);

  if (tone === "hidden") {
    return `当前筛选范围无效，未加载预算数据。${state.invalidReason ?? ""}`;
  }

  if (tone === "loading") {
    return `正在加载 ${periodLabel} 预算数据… · 范围：${scopeDescription}`;
  }

  if (tone === "real") {
    return `真实预算数据 · 账期 ${periodLabel} · 范围：${scopeDescription}`;
  }

  if (!state.hasSupabaseEnv) {
    return `演示或本地预算（系统未连接预算库）· 账期 ${periodLabel} · 范围：${scopeDescription}`;
  }

  if (state.budgetSource === "localStorage") {
    return `本账期 ${periodLabel} 无库内预算目标，当前使用本机已保存的预算草稿 · 范围：${scopeDescription}`;
  }

  if (state.queryError) {
    return `库内查询暂不可用，当前为演示预算 · 账期 ${periodLabel} · 范围：${scopeDescription}`;
  }

  return `演示预算（本账期 ${periodLabel} 在所选范围内暂无已录入的预算目标）· 范围：${scopeDescription}`;
}

export function budgetBannerUsesDemoTone(tone: BudgetBannerTone): boolean {
  return tone === "demo";
}
