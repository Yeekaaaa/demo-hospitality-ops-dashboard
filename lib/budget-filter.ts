/**
 * 预算管理页统一筛选状态（唯一数据源）
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import { 全部门店值 } from "@/lib/store-master";
import { reportPeriodToActualDataPeriod } from "@/src/lib/dashboard-data-service";
import type { ActualDataStoreScope } from "@/src/lib/active-store-ids";
import {
  findDefaultActiveSupabaseStoreId,
  filterActiveStores,
  isLegacyMockStoreId,
  isSupabaseStoreUuid,
  sanitizeCachedStoreSelection
} from "@/lib/active-store-scope";
import type { StoreListItem } from "@/src/lib/supabase";
import {
  DEFAULT_BUDGET_VERSION,
  normalizeBudgetVersion,
  type BudgetVersionValue
} from "@/lib/budget-versions";

export type BudgetQuarter = "Q1" | "Q2" | "Q3" | "Q4";

export type BudgetFilter = {
  storeScope: "all" | "single";
  storeId: string | null;
  periodType: "month" | "quarter" | "year";
  year: number;
  month?: number;
  quarter?: BudgetQuarter;
  budgetVersion: BudgetVersionValue;
};

export const BUDGET_FILTER_STORAGE_KEY = "fengtin_budget_filter_v1";

export const DEFAULT_BUDGET_FILTER: BudgetFilter = {
  storeScope: "single",
  storeId: null,
  periodType: "month",
  year: 2026,
  month: 4,
  quarter: "Q2",
  budgetVersion: DEFAULT_BUDGET_VERSION
};

export function quarterFromMonth(month: number): BudgetQuarter {
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

export function quarterToNumber(q: BudgetQuarter): number {
  return Number(q.replace("Q", ""));
}

export function budgetFilterStorageScope(filter: BudgetFilter): string {
  return filter.storeScope === "all" ? 全部门店值 : filter.storeId!;
}

export function budgetFilterToReportPeriod(filter: BudgetFilter): ReportPeriod {
  if (filter.periodType === "month") {
    return { 粒度: "month", 年: filter.year, 月: filter.month ?? 1 };
  }
  if (filter.periodType === "quarter") {
    return {
      粒度: "quarter",
      年: filter.year,
      季: quarterToNumber(filter.quarter ?? "Q2")
    };
  }
  return { 粒度: "year", 年: filter.year };
}

export function budgetFilterToActualDataPeriod(filter: BudgetFilter): {
  period_type: string;
  period_value: string;
} {
  return reportPeriodToActualDataPeriod(budgetFilterToReportPeriod(filter));
}

export function budgetFilterToActualDataScope(
  filter: BudgetFilter,
  activeStoreIds: readonly string[]
): ActualDataStoreScope {
  if (filter.storeScope === "all") {
    return activeStoreIds.length ? [...activeStoreIds] : [];
  }
  const id = filter.storeId;
  if (!id) return [];
  return activeStoreIds.includes(id) ? id : [];
}

export function createDefaultBudgetFilter(stores: readonly StoreListItem[]): BudgetFilter {
  const zetongId = findDefaultActiveSupabaseStoreId(stores);
  if (zetongId) {
    return {
      storeScope: "single",
      storeId: zetongId,
      periodType: "month",
      year: DEFAULT_BUDGET_FILTER.year,
      month: DEFAULT_BUDGET_FILTER.month,
      quarter: DEFAULT_BUDGET_FILTER.quarter,
      budgetVersion: DEFAULT_BUDGET_VERSION
    };
  }
  return {
    storeScope: "all",
    storeId: null,
    periodType: "month",
    year: DEFAULT_BUDGET_FILTER.year,
    month: DEFAULT_BUDGET_FILTER.month,
    quarter: DEFAULT_BUDGET_FILTER.quarter,
    budgetVersion: DEFAULT_BUDGET_VERSION
  };
}

function isValidBudgetFilterShape(parsed: unknown): parsed is Partial<BudgetFilter> {
  if (!parsed || typeof parsed !== "object") return false;
  const p = parsed as Record<string, unknown>;
  return (
    (p.storeScope === "all" || p.storeScope === "single") &&
    (p.periodType === "month" || p.periodType === "quarter" || p.periodType === "year")
  );
}

export function sanitizeBudgetFilterWithActiveStores(
  filter: BudgetFilter,
  stores: readonly StoreListItem[]
): BudgetFilter {
  const normalized = normalizeBudgetFilter(filter);

  if (normalized.storeScope === "single" && normalized.storeId) {
    if (isLegacyMockStoreId(normalized.storeId) || !isSupabaseStoreUuid(normalized.storeId)) {
      return createDefaultBudgetFilter(stores);
    }
    const active = filterActiveStores([...stores]);
    if (!active.some((s) => s.id === normalized.storeId)) {
      return createDefaultBudgetFilter(stores);
    }
    return normalized;
  }

  if (normalized.storeScope === "single" && !normalized.storeId) {
    const fallback = findDefaultActiveSupabaseStoreId(stores);
    if (fallback) {
      return { ...normalized, storeScope: "single", storeId: fallback };
    }
    return { ...normalized, storeScope: "all", storeId: null };
  }

  return normalized;
}

export function sanitizeTopbarStoreId(
  storeId: string,
  stores: readonly StoreListItem[]
): string {
  if (storeId === 全部门店值) return 全部门店值;
  const { storeScope, storeId: id } = sanitizeCachedStoreSelection(storeId, stores);
  if (storeScope === "all") return 全部门店值;
  return id ?? findDefaultActiveSupabaseStoreId(stores) ?? 全部门店值;
}

export function budgetFilterPeriodLabel(filter: BudgetFilter): string {
  if (filter.periodType === "month") {
    return `${filter.year} 年 ${filter.month ?? 1} 月`;
  }
  if (filter.periodType === "quarter") {
    return `${filter.year} 年 ${filter.quarter ?? "Q2"}`;
  }
  return `${filter.year} 年度`;
}

export function loadBudgetFilterFromSession(stores: readonly StoreListItem[]): BudgetFilter {
  if (typeof window === "undefined") return createDefaultBudgetFilter(stores);
  try {
    const raw = window.sessionStorage.getItem(BUDGET_FILTER_STORAGE_KEY);
    if (!raw) return createDefaultBudgetFilter(stores);
    const parsed: unknown = JSON.parse(raw);
    if (!isValidBudgetFilterShape(parsed)) {
      window.sessionStorage.removeItem(BUDGET_FILTER_STORAGE_KEY);
      return createDefaultBudgetFilter(stores);
    }
    const merged = {
      ...createDefaultBudgetFilter(stores),
      ...parsed,
      budgetVersion: normalizeBudgetVersion((parsed as { budgetVersion?: string }).budgetVersion)
    } as BudgetFilter;
    return sanitizeBudgetFilterWithActiveStores(merged, stores);
  } catch {
    window.sessionStorage.removeItem(BUDGET_FILTER_STORAGE_KEY);
    return createDefaultBudgetFilter(stores);
  }
}

export function saveBudgetFilterToSession(filter: BudgetFilter): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(BUDGET_FILTER_STORAGE_KEY, JSON.stringify(filter));
}

export function normalizeBudgetFilter(f: BudgetFilter): BudgetFilter {
  const year = Number.isFinite(f.year) ? f.year : DEFAULT_BUDGET_FILTER.year;
  const month =
    f.periodType === "month"
      ? Math.min(12, Math.max(1, f.month ?? DEFAULT_BUDGET_FILTER.month ?? 4))
      : f.month;
  const quarter =
    f.periodType === "quarter"
      ? (f.quarter ?? quarterFromMonth(month ?? 4))
      : f.quarter;
  const budgetVersion = normalizeBudgetVersion(f.budgetVersion);

  if (f.storeScope === "single" && f.storeId) {
    return {
      storeScope: "single",
      storeId: f.storeId,
      periodType: f.periodType,
      year,
      month,
      quarter,
      budgetVersion
    };
  }
  return {
    storeScope: "all",
    storeId: null,
    periodType: f.periodType,
    year,
    month,
    quarter,
    budgetVersion
  };
}
