/**
 * 财务报表页统一筛选状态
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import {
  DEFAULT_BUDGET_VERSION,
  normalizeBudgetVersion,
  type BudgetVersionValue
} from "@/lib/budget-versions";
import {
  getActiveHotelStoreIds,
  getActiveRestaurantStoreIds,
  getActiveStoreIds,
  findDefaultActiveSupabaseStoreId,
  isLegacyMockStoreId,
  isSupabaseStoreUuid,
} from "@/lib/active-store-scope";
import type { ActualDataStoreScope } from "@/src/lib/active-store-ids";
import type { StoreListItem } from "@/src/lib/supabase";

export type FinancialReportScope = "single" | "activeStores" | "hotelBoard" | "restaurantBoard";

export type FinancialReportFilter = {
  reportScope: FinancialReportScope;
  storeId: string | null;
  year: number;
  month: number;
  budgetVersion: BudgetVersionValue;
};

export const FINANCIAL_REPORT_FILTER_STORAGE_KEY = "fengtin_financial_report_filter_v1";

export const DEFAULT_FINANCIAL_REPORT_FILTER: FinancialReportFilter = {
  reportScope: "single",
  storeId: null,
  year: 2026,
  month: 4,
  budgetVersion: DEFAULT_BUDGET_VERSION
};

export function financialReportFilterToReportPeriod(filter: FinancialReportFilter): ReportPeriod {
  return { 粒度: "month", 年: filter.year, 月: filter.month };
}

export function financialReportFilterPeriodLabel(filter: FinancialReportFilter): string {
  return `${filter.year} 年 ${filter.month} 月`;
}

export function financialReportFilterToActualDataScope(
  filter: FinancialReportFilter,
  stores: readonly StoreListItem[]
): ActualDataStoreScope {
  const activeIds = getActiveStoreIds(stores);
  const hotelIds = getActiveHotelStoreIds(stores);
  const restIds = getActiveRestaurantStoreIds(stores);

  if (filter.reportScope === "single") {
    const id = filter.storeId;
    if (!id || !activeIds.includes(id)) return [];
    return id;
  }
  if (filter.reportScope === "activeStores") {
    return activeIds.length ? activeIds : [];
  }
  if (filter.reportScope === "hotelBoard") {
    return hotelIds.length ? hotelIds : [];
  }
  if (filter.reportScope === "restaurantBoard") {
    return restIds.length ? restIds : [];
  }
  return [];
}

export function financialReportScopeLabel(
  filter: FinancialReportFilter,
  stores: readonly StoreListItem[]
): string {
  if (filter.reportScope === "single" && filter.storeId) {
    const s = stores.find((x) => x.id === filter.storeId);
    return s ? `${s.name}${s.brand ? `-${s.brand}` : ""}` : filter.storeId;
  }
  if (filter.reportScope === "activeStores") return "当前经营门店汇总";
  if (filter.reportScope === "hotelBoard") return "酒店板块汇总";
  if (filter.reportScope === "restaurantBoard") return "餐饮板块汇总";
  return "—";
}

export function normalizeFinancialReportFilter(f: FinancialReportFilter): FinancialReportFilter {
  const year = Number.isFinite(f.year) ? f.year : DEFAULT_FINANCIAL_REPORT_FILTER.year;
  const month = Math.min(12, Math.max(1, f.month ?? DEFAULT_FINANCIAL_REPORT_FILTER.month));
  const budgetVersion = normalizeBudgetVersion(f.budgetVersion);
  const reportScope = f.reportScope ?? "single";

  if (reportScope === "single") {
    return {
      reportScope: "single",
      storeId: f.storeId,
      year,
      month,
      budgetVersion
    };
  }
  return {
    reportScope,
    storeId: null,
    year,
    month,
    budgetVersion
  };
}

export function sanitizeFinancialReportFilter(
  filter: FinancialReportFilter,
  stores: readonly StoreListItem[]
): FinancialReportFilter {
  const normalized = normalizeFinancialReportFilter(filter);
  const budgetVersion = normalizeBudgetVersion(normalized.budgetVersion);

  if (normalized.reportScope !== "single") {
    return { ...normalized, storeId: null, budgetVersion };
  }

  const id = normalized.storeId;
  if (id && isSupabaseStoreUuid(id) && !isLegacyMockStoreId(id)) {
    const active = getActiveStoreIds(stores);
    if (active.includes(id)) {
      return { ...normalized, storeId: id, budgetVersion };
    }
  }

  const fallback = findDefaultActiveSupabaseStoreId(stores);
  return {
    ...normalized,
    reportScope: "single",
    storeId: fallback,
    budgetVersion
  };
}

export function loadFinancialReportFilterFromSession(): FinancialReportFilter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(FINANCIAL_REPORT_FILTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FinancialReportFilter>;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeFinancialReportFilter({
      ...DEFAULT_FINANCIAL_REPORT_FILTER,
      ...parsed,
      budgetVersion: normalizeBudgetVersion(
        (parsed as { budgetVersion?: string }).budgetVersion
      )
    });
  } catch {
    return null;
  }
}

export function saveFinancialReportFilterToSession(filter: FinancialReportFilter): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(FINANCIAL_REPORT_FILTER_STORAGE_KEY, JSON.stringify(filter));
}

export function createDefaultFinancialReportFilter(
  stores: readonly StoreListItem[]
): FinancialReportFilter {
  const fallback = findDefaultActiveSupabaseStoreId(stores);
  return sanitizeFinancialReportFilter(
    {
      reportScope: fallback ? "single" : "activeStores",
      storeId: fallback,
      year: DEFAULT_FINANCIAL_REPORT_FILTER.year,
      month: DEFAULT_FINANCIAL_REPORT_FILTER.month,
      budgetVersion: DEFAULT_BUDGET_VERSION
    },
    stores
  );
}
