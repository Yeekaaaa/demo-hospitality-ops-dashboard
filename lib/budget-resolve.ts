/**
 * 预算读取：Supabase budget_data 优先，localStorage budget_overrides fallback
 */

import { getBudgetForScope, type FinancialLineActual, type ReportPeriod } from "@/lib/mock-analytics";
import type { BudgetOverrideMap } from "@/lib/budget-overrides";
import { DEFAULT_BUDGET_VERSION, type BudgetVersionValue } from "@/lib/budget-versions";
import { 全部门店值 } from "@/lib/store-master";

export type BudgetSourceMode = "supabase" | "localStorage" | "mock_derived";

export function resolveBudgetFinancialLine(params: {
  dbLine: FinancialLineActual | null;
  useDbBudget: boolean;
  mockScope: typeof 全部门店值 | string;
  period: ReportPeriod;
  overrides?: BudgetOverrideMap;
  budgetVersion?: BudgetVersionValue;
}): { line: FinancialLineActual; source: BudgetSourceMode } {
  const version = params.budgetVersion ?? DEFAULT_BUDGET_VERSION;

  if (params.useDbBudget && params.dbLine) {
    return { line: params.dbLine, source: "supabase" };
  }

  const storageKey = params.mockScope;
  const hasOverride =
    Boolean(params.overrides) &&
    Object.keys(params.overrides!).some((k) => k.startsWith(`${storageKey}|`));

  const line = getBudgetForScope(params.mockScope, params.period, params.overrides, version);
  return { line, source: hasOverride ? "localStorage" : "mock_derived" };
}

export function budgetSourceLabel(source: BudgetSourceMode): string {
  if (source === "supabase") return "Supabase budget_data";
  if (source === "localStorage") return "localStorage budget_overrides";
  return "Mock demo budget（由实际推演）";
}
