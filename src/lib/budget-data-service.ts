/**
 * Supabase budget_data：预算目标读写与聚合（与 actual_data 完全分离）
 */

import { toDbPeriod } from "@/lib/data-caliber";
import { normalizeBudgetVersion, DEFAULT_BUDGET_VERSION, type BudgetVersionValue } from "@/lib/budget-versions";
import {
  budgetDataRowsToCanonicalSubjectMap,
  budgetSubjectMapToUpsertPayload
} from "@/lib/budget-canonical";
import type { BudgetSubjectValueMap } from "@/lib/budget-overrides";

export { budgetDataRowsToCanonicalSubjectMap, budgetSubjectMapToUpsertPayload } from "@/lib/budget-canonical";
export { BUDGET_CORE_LABELS } from "@/lib/budget-canonical";
import type { FinancialLineActual, ReportPeriod } from "@/lib/mock-analytics";
import { isSupabaseStoreUuid } from "@/lib/active-store-scope";
import {
  fetchActiveStoreIds,
  resolveActualDataStoreScope,
  type ActualDataStoreScope
} from "@/src/lib/active-store-ids";
import { getSupabaseClient } from "@/src/lib/supabase";

export const BUDGET_DATA_TABLE = "budget_data" as const;

/** 与唯一约束 budget_data_store_period_version_uidx 对齐 */
export const BUDGET_DATA_UPSERT_ON_CONFLICT =
  "store_id,period_type,period_value,budget_version" as const;

export type BudgetDataRow = {
  id?: string;
  store_id: string;
  period_type: string;
  period_value: string;
  budget_version: string;
  revenue_budget: number | null;
  cost_budget: number | null;
  profit_budget: number | null;
  room_revenue_budget: number | null;
  rooms_available_budget: number | null;
  rooms_sold_budget: number | null;
  created_at?: string;
  updated_at?: string;
};

export type BudgetDataUpsertPayload = {
  store_id: string;
  period_type: string;
  period_value: string;
  budget_version: string;
  revenue_budget?: number | null;
  cost_budget?: number | null;
  profit_budget?: number | null;
  room_revenue_budget?: number | null;
  rooms_available_budget?: number | null;
  rooms_sold_budget?: number | null;
  updated_at?: string;
};

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function roundFin(line: FinancialLineActual): FinancialLineActual {
  const keys = Object.keys(line) as (keyof FinancialLineActual)[];
  const out = { ...line };
  keys.forEach((k) => {
    if (k === "利润率") return;
    (out[k] as number) = Math.round((out[k] as number) * 10) / 10;
  });
  out.利润率 = out.营业收入 > 0 ? out.营业利润 / out.营业收入 : 0;
  return out;
}

function emptyFinancialLine(): FinancialLineActual {
  return {
    营业收入: 0,
    客房收入: 0,
    餐饮收入: 0,
    其他收入: 0,
    人力成本: 0,
    能源费用: 0,
    华住管理费: 0,
    客房服务成本: 0,
    非客房服务成本: 0,
    原材料成本: 0,
    毛利: 0,
    营业利润: 0,
    利润率: 0
  };
}

/** 多行 budget_data → 利润表结构（成本汇总至人力成本，供 resolveBudgetTotals 使用） */
export function aggregateBudgetDataRows(rows: BudgetDataRow[]): FinancialLineActual {
  if (!rows.length) return emptyFinancialLine();

  let revenue = 0;
  let cost = 0;
  let profit = 0;
  let roomRevenue = 0;

  for (const row of rows) {
    revenue += num(row.revenue_budget);
    cost += num(row.cost_budget);
    profit += num(row.profit_budget);
    roomRevenue += num(row.room_revenue_budget);
  }

  if (profit === 0 && revenue > 0 && cost > 0) {
    profit = revenue - cost;
  }

  if (revenue === 0 && cost === 0 && profit === 0) {
    return emptyFinancialLine();
  }

  return roundFin({
    营业收入: revenue,
    客房收入: roomRevenue > 0 ? roomRevenue : revenue,
    餐饮收入: 0,
    其他收入: 0,
    人力成本: cost,
    能源费用: 0,
    华住管理费: 0,
    客房服务成本: 0,
    非客房服务成本: 0,
    原材料成本: 0,
    毛利: revenue - cost,
    营业利润: profit,
    利润率: revenue > 0 ? profit / revenue : 0
  });
}

/** @deprecated 使用 budgetDataRowsToCanonicalSubjectMap */
export const budgetDataRowsToSubjectMap = budgetDataRowsToCanonicalSubjectMap;

export function hasSupabaseBudgetEnv(): boolean {
  return Boolean(
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
      typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}

/** 单店 UUID 直接 eq；汇总走 active 列表过滤 */
async function resolveBudgetQueryStoreIds(
  storeScope: ActualDataStoreScope
): Promise<{ ids: string[]; error: string | null }> {
  if (Array.isArray(storeScope)) {
    if (storeScope.length === 0) {
      return { ids: [], error: "聚合 scope 为空，未查询 budget_data" };
    }
    const activeIds = await fetchActiveStoreIds();
    const filtered = storeScope.filter((id) => activeIds.includes(id));
    if (!filtered.length) {
      return { ids: [], error: "聚合 scope 中无 active 门店 UUID" };
    }
    return { ids: [...filtered], error: null };
  }

  if (typeof storeScope === "string" && isSupabaseStoreUuid(storeScope)) {
    return { ids: [storeScope], error: null };
  }

  const resolved = await resolveActualDataStoreScope(storeScope);
  if (typeof resolved === "string") {
    return { ids: [resolved], error: null };
  }
  if (Array.isArray(resolved) && resolved.length > 0) {
    return { ids: [...resolved], error: null };
  }
  return { ids: [], error: "无法解析 budget_data 门店 scope" };
}

export type BudgetDataQueryResult = {
  rows: BudgetDataRow[];
  error: string | null;
  queriedStoreIds: string[];
};

/**
 * 按门店范围 + 账期 + 版本读取 budget_data 行
 */
export async function getBudgetDataByScopeAndPeriod(
  storeScope: ActualDataStoreScope,
  reportPeriod: ReportPeriod,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
): Promise<BudgetDataQueryResult> {
  if (!hasSupabaseBudgetEnv()) {
    return { rows: [], error: "未配置 Supabase 环境变量", queriedStoreIds: [] };
  }

  const { ids, error: scopeError } = await resolveBudgetQueryStoreIds(storeScope);
  if (!ids.length) {
    return { rows: [], error: scopeError, queriedStoreIds: [] };
  }

  const { period_type, period_value } = toDbPeriod(reportPeriod);
  const version = normalizeBudgetVersion(budgetVersion);

  try {
    const client = getSupabaseClient();
    let q = client
      .from(BUDGET_DATA_TABLE)
      .select("*")
      .eq("period_type", period_type)
      .eq("period_value", period_value)
      .eq("budget_version", version);

    if (ids.length === 1) {
      q = q.eq("store_id", ids[0]!);
    } else {
      q = q.in("store_id", ids);
    }

    const { data, error } = await q;
    if (error) {
      return { rows: [], error: error.message, queriedStoreIds: ids };
    }
    return { rows: (data ?? []) as BudgetDataRow[], error: null, queriedStoreIds: ids };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : "budget_data 查询异常",
      queriedStoreIds: ids
    };
  }
}

/**
 * 聚合后的预算利润表行；无行或核心收入为 0 时返回 null（触发 localStorage fallback）
 */
export async function getBudgetForScopeFromSupabase(
  storeScope: ActualDataStoreScope,
  reportPeriod: ReportPeriod,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
): Promise<FinancialLineActual | null> {
  const { rows } = await getBudgetDataByScopeAndPeriod(storeScope, reportPeriod, budgetVersion);
  if (!rows.length) return null;
  const line = aggregateBudgetDataRows(rows);
  if (line.营业收入 <= 0 && line.营业利润 <= 0 && line.人力成本 <= 0) return null;
  return line;
}

export type BudgetFinancialLinesByPeriodResult = {
  byPeriod: Record<string, FinancialLineActual>;
  error: string | null;
  queriedStoreIds: string[];
};

/**
 * 多账期 budget_data → 每月一条 FinancialLineActual（与单月 aggregateBudgetDataRows 口径一致）
 */
export async function getBudgetFinancialLinesByPeriodValues(
  storeScope: ActualDataStoreScope,
  periodValues: readonly string[],
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
): Promise<BudgetFinancialLinesByPeriodResult> {
  const uniquePeriods = [...new Set(periodValues.map((p) => p.trim()).filter(Boolean))];
  if (!uniquePeriods.length) {
    return { byPeriod: {}, error: null, queriedStoreIds: [] };
  }
  if (!hasSupabaseBudgetEnv()) {
    return { byPeriod: {}, error: "未配置 Supabase 环境变量", queriedStoreIds: [] };
  }

  const { ids, error: scopeError } = await resolveBudgetQueryStoreIds(storeScope);
  if (!ids.length) {
    return { byPeriod: {}, error: scopeError, queriedStoreIds: [] };
  }

  const version = normalizeBudgetVersion(budgetVersion);

  try {
    const client = getSupabaseClient();
    let q = client
      .from(BUDGET_DATA_TABLE)
      .select("*")
      .eq("period_type", "month")
      .eq("budget_version", version)
      .in("period_value", uniquePeriods);

    if (ids.length === 1) {
      q = q.eq("store_id", ids[0]!);
    } else {
      q = q.in("store_id", ids);
    }

    const { data, error } = await q;
    if (error) {
      return { byPeriod: {}, error: error.message, queriedStoreIds: ids };
    }

    const grouped: Record<string, BudgetDataRow[]> = {};
    for (const raw of data ?? []) {
      const row = raw as BudgetDataRow;
      const pv = String(row.period_value ?? "");
      if (!pv) continue;
      if (!grouped[pv]) grouped[pv] = [];
      grouped[pv].push(row);
    }

    const byPeriod: Record<string, FinancialLineActual> = {};
    for (const pv of uniquePeriods) {
      const periodRows = grouped[pv];
      if (!periodRows?.length) continue;
      const line = aggregateBudgetDataRows(periodRows);
      if (line.营业收入 <= 0 && line.营业利润 <= 0 && line.人力成本 <= 0) continue;
      byPeriod[pv] = line;
    }

    return { byPeriod, error: null, queriedStoreIds: ids };
  } catch (e) {
    return {
      byPeriod: {},
      error: e instanceof Error ? e.message : "budget_data 趋势查询异常",
      queriedStoreIds: ids
    };
  }
}

export type UpsertBudgetDataResult = { ok: true } | { ok: false; error: string };

export async function upsertBudgetData(
  payload: BudgetDataUpsertPayload
): Promise<UpsertBudgetDataResult> {
  if (!hasSupabaseBudgetEnv()) {
    return { ok: false, error: "未配置 Supabase 环境变量" };
  }

  const version = normalizeBudgetVersion(payload.budget_version);
  const row = {
    ...payload,
    budget_version: version,
    updated_at: new Date().toISOString()
  };

  try {
    const client = getSupabaseClient();
    const activeIds = await fetchActiveStoreIds();
    if (!activeIds.includes(payload.store_id)) {
      return { ok: false, error: "门店不在当前经营范围内" };
    }

    const { error } = await client.from(BUDGET_DATA_TABLE).upsert(row, {
      onConflict: BUDGET_DATA_UPSERT_ON_CONFLICT
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "写入失败" };
  }
}

/** 批量 upsert（Excel 导入：按门店+账期聚合科目后写入） */
export async function upsertBudgetDataBatch(
  payloads: BudgetDataUpsertPayload[]
): Promise<{ successCount: number; failCount: number; errors: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const p of payloads) {
    const res = await upsertBudgetData(p);
    if (res.ok) successCount += 1;
    else {
      failCount += 1;
      errors.push(res.error);
    }
  }

  return { successCount, failCount, errors };
}
