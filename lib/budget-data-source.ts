import type { BudgetScopeMode } from "@/lib/budget-scope";
import type { BudgetSourceMode } from "@/lib/budget-resolve";

export type BudgetDataHintState = {
  hasSupabaseEnv: boolean;
  loading: boolean;
  scopeMode: BudgetScopeMode;
  useDbBudget: boolean;
  budgetSource: BudgetSourceMode;
  /** 单店 UUID */
  singleStoreId: string | null;
  /** Supabase 查询错误 */
  queryError: string | null;
  /** 已查行数 */
  rowCount: number;
  invalidReason: string | null;
};

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
