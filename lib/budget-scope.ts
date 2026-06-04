/**
 * 预算管理 / budget_data 门店范围解析（单店必须 UUID，禁止误用城市聚合 scope）
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import { 全部门店值 } from "@/lib/store-master";
import { getActiveStoreIds, isSupabaseStoreUuid } from "@/lib/active-store-scope";
import { formatStoreOptionLabel, type StoreListItem as SupabaseStore } from "@/src/lib/supabase";
import type { ActualDataStoreScope } from "@/src/lib/active-store-ids";
import type { BudgetFilter } from "@/lib/budget-filter";
import { toDbPeriod } from "@/lib/data-caliber";

export type BudgetScopeMode = "single" | "aggregate" | "invalid";

export type BudgetScopeResolution = {
  mode: BudgetScopeMode;
  /** Supabase 查询用 scope */
  queryScope: ActualDataStoreScope;
  /** 单店 UUID（仅 mode=single） */
  singleStoreId: string | null;
  /** 展示用文案 */
  scopeLabel: string;
  /** 无效原因（mode=invalid） */
  invalidReason: string | null;
};

export function isBudgetSingleStoreFilter(filter: BudgetFilter): boolean {
  return (
    filter.storeScope === "single" &&
    Boolean(filter.storeId) &&
    isSupabaseStoreUuid(filter.storeId)
  );
}

/**
 * 预算管理页：单店 → 该店 stores.id；全部门店 → active UUID 列表。
 * 不使用城市/集团聚合 id 作为业务页默认范围。
 */
export function resolveBudgetScopeForFilter(
  filter: BudgetFilter,
  stores: readonly SupabaseStore[]
): BudgetScopeResolution {
  if (filter.storeScope === "single") {
    const id = filter.storeId;
    if (!id) {
      return {
        mode: "invalid",
        queryScope: [],
        singleStoreId: null,
        scopeLabel: "—",
        invalidReason: "已选「单店」但未绑定 store_id，请重新选择门店下拉项"
      };
    }
    if (!isSupabaseStoreUuid(id)) {
      return {
        mode: "invalid",
        queryScope: [],
        singleStoreId: null,
        scopeLabel: String(id),
        invalidReason: `门店值「${id}」不是 Supabase UUID，无法查询 budget_data`
      };
    }
    const store = stores.find((s) => s.id === id);
    if (!store) {
      return {
        mode: "invalid",
        queryScope: [],
        singleStoreId: id,
        scopeLabel: id,
        invalidReason: `store_id=${id} 不在当前经营门店列表（${getActiveStoreIds(stores).length} 家 active）`
      };
    }
    return {
      mode: "single",
      queryScope: id,
      singleStoreId: id,
      scopeLabel: `${formatStoreOptionLabel(store)}（store_id=${id.slice(0, 8)}…）`,
      invalidReason: null
    };
  }

  const ids = getActiveStoreIds(stores);
  if (!ids.length) {
    return {
      mode: "invalid",
      queryScope: [],
      singleStoreId: null,
      scopeLabel: "—",
      invalidReason: "全部门店模式下无可用经营门店 UUID"
    };
  }

  return {
    mode: "aggregate",
    queryScope: [...ids],
    singleStoreId: null,
    scopeLabel: `经营门店汇总（${ids.length} 店，按 store_id IN 聚合）`,
    invalidReason: null
  };
}

export function describeBudgetQueryTarget(
  resolution: BudgetScopeResolution,
  reportPeriod: ReportPeriod,
  budgetVersion: string
): string {
  const { period_type, period_value } = toDbPeriod(reportPeriod);
  const ver = budgetVersion;
  if (resolution.mode === "single" && resolution.singleStoreId) {
    return `budget_data WHERE store_id='${resolution.singleStoreId}' AND period_type='${period_type}' AND period_value='${period_value}' AND budget_version='${ver}'`;
  }
  if (resolution.mode === "aggregate") {
    const n = Array.isArray(resolution.queryScope) ? resolution.queryScope.length : 0;
    return `budget_data WHERE store_id IN (${n} 家) AND period_type='${period_type}' AND period_value='${period_value}' AND budget_version='${ver}'`;
  }
  return "未发起 budget_data 查询（scope 无效）";
}

/** mock / localStorage 用的 scope：单店用 UUID，汇总用 全部门店值 */
export function budgetMockFallbackScope(filter: BudgetFilter): typeof 全部门店值 | string {
  if (isBudgetSingleStoreFilter(filter) && filter.storeId) {
    return filter.storeId;
  }
  return 全部门店值;
}

/** Dashboard / 财报 / 酒店运营：由 actual_data 同款 queryScope 推导 budget scope */
export function resolveBudgetScopeFromQueryScope(
  queryScope: ActualDataStoreScope,
  stores: readonly SupabaseStore[]
): BudgetScopeResolution {
  if (typeof queryScope === "string" && isSupabaseStoreUuid(queryScope)) {
    return resolveBudgetScopeForFilter(
      {
        storeScope: "single",
        storeId: queryScope,
        periodType: "month",
        year: 2026,
        month: 4,
        budgetVersion: "base"
      },
      stores
    );
  }
  if (Array.isArray(queryScope)) {
    if (queryScope.length === 1 && isSupabaseStoreUuid(queryScope[0]!)) {
      return resolveBudgetScopeForFilter(
        {
          storeScope: "single",
          storeId: queryScope[0]!,
          periodType: "month",
          year: 2026,
          month: 4,
          budgetVersion: "base"
        },
        stores
      );
    }
    if (queryScope.length === 0) {
      return {
        mode: "invalid",
        queryScope: [],
        singleStoreId: null,
        scopeLabel: "—",
        invalidReason: "queryScope 为空数组"
      };
    }
    return {
      mode: "aggregate",
      queryScope: [...queryScope],
      singleStoreId: null,
      scopeLabel: `多店汇总（${queryScope.length} 店 store_id IN）`,
      invalidReason: null
    };
  }
  return {
    mode: "invalid",
    queryScope: [],
    singleStoreId: null,
    scopeLabel: "—",
    invalidReason: "未知 queryScope"
  };
}
