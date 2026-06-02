import type { ReportPeriod } from "@/lib/mock-analytics";
import { BUDGET_DATA_STORAGE_KEY as STORAGE_KEY_FROM_CALIBER } from "@/lib/data-caliber";
import { DEFAULT_BUDGET_VERSION, normalizeBudgetVersion, type BudgetVersionValue } from "@/lib/budget-versions";
import { BUDGET_SUBJECT_LABELS } from "@/lib/budget-subjects";

/** v2：storage key 含 budgetVersion，与旧版 v1 隔离（与 data-caliber 一致） */
export const LOCAL_STORAGE_BUDGET_KEY = STORAGE_KEY_FROM_CALIBER;

/** 科目名称 → 预算值 */
export type BudgetSubjectValueMap = Record<string, number>;

export type BudgetOverrideMap = Record<string, BudgetSubjectValueMap>;

/** @deprecated 与 BudgetSubjectValueMap 相同，保留兼容 */
export type BudgetEditableValues = BudgetSubjectValueMap;

/** @deprecated 使用标准科目名称字符串 */
export type BudgetEditableKey = string;

export function buildBudgetStorageKey(
  scope: string,
  period: ReportPeriod,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
): string {
  const version = normalizeBudgetVersion(budgetVersion);
  const suffix =
    period.粒度 === "month"
      ? `m${period.月 ?? 1}`
      : period.粒度 === "quarter"
        ? `q${period.季 ?? 1}`
        : "y";
  return `${scope}|${period.粒度}|${period.年}|${suffix}|${version}`;
}

export function budgetEditableKeys(): string[] {
  return [...BUDGET_SUBJECT_LABELS];
}
