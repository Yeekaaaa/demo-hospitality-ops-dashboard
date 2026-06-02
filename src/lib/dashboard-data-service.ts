import {
  calcChange,
  calcRevPAR,
  getPreviousPeriod,
  getYearAgoPeriod,
  reportPeriodToDbPeriod
} from "@/lib/dashboard-metrics";
import {
  isStoreOpenInPeriod,
  trendPeriodsForAllStores,
  trendPeriodsForSingleStore
} from "@/lib/trend-periods";
import type { ReportPeriod } from "@/lib/mock-analytics";
import { isActiveStore } from "@/lib/active-store-scope";
import { 全部门店值 } from "@/lib/store-master";
import {
  fetchActiveStoreIds,
  resolveActualDataStoreScope,
  type ActualDataStoreScope
} from "@/src/lib/active-store-ids";
import { getSupabaseClient } from "@/src/lib/supabase";

export type { ActualDataStoreScope };
import { getTotalCost } from "./cost";

/** 首页第一行 MetricCard 可用的聚合结果（金额单位需与 DB 约定一致，建议与 mock 一致：万元） */
export interface DashboardActualAggregate {
  /** sum(revenue) */
  revenue: number;
  /** sum(rooms_sold) / sum(rooms_available)，分母为 0 时为 null */
  occupancy_rate: number | null;
  /** 客房收入由万元转元后 ÷ Σ rooms_sold；单位：元；无法计算时为 null */
  adr: number | null;
  /** 客房收入由万元转元后 ÷ Σ rooms_available；单位：元；无法计算时为 null */
  revpar: number | null;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** 与前端账期对齐写入 DB：`period_value` 编码规则见文档注释 */
export function reportPeriodToActualDataPeriod(reportPeriod: ReportPeriod): {
  period_type: string;
  period_value: string;
} {
  if (reportPeriod.粒度 === "month") {
    const m = reportPeriod.月 ?? 1;
    return {
      period_type: "month",
      period_value: `${reportPeriod.年}-${String(m).padStart(2, "0")}`
    };
  }
  if (reportPeriod.粒度 === "quarter") {
    const q = reportPeriod.季 ?? 1;
    return {
      period_type: "quarter",
      period_value: `${reportPeriod.年}-Q${q}`
    };
  }
  return {
    period_type: "year",
    period_value: String(reportPeriod.年)
  };
}

/** 行内客房收入：优先 room_revenue；其次 adr×rooms_sold；再次 revpar×rooms_available */
function rowRoomRevenue(row: Record<string, unknown>): number {
  const rr = row.room_revenue ?? row.room_revenue_amount;
  const rrNum = num(rr);
  if (rrNum > 0) return rrNum;
  const adr = num(row.adr);
  const sold = num(row.rooms_sold);
  if (adr > 0 && sold > 0) return adr * sold;
  const rp = num(row.revpar);
  const avail = num(row.rooms_available);
  if (rp > 0 && avail > 0) return rp * avail;
  return 0;
}

function rowProfit(row: Record<string, unknown>): number {
  const p = nullableNum(row.profit);
  if (p != null) return p;
  return num(row.revenue) - getTotalCost(row);
}

/**
 * 从 Supabase `actual_data` 读取并聚合首页 KPI（不含 mock）。
 * - storeId === `全部门店值`（`"all"`）：仅聚合 active stores（`.in(store_id, …)`）。
 * - 单门店：`store_id` 精确匹配。
 * - 匹配 `period_type` + `period_value`（由 reportPeriod 推导）。
 */
export async function getDashboardKpisFromSupabase(
  storeId: string,
  reportPeriod: ReportPeriod
): Promise<DashboardActualAggregate | null> {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasEnv) {
    return null;
  }

  try {
    const client = getSupabaseClient();
    const { period_type, period_value } = reportPeriodToActualDataPeriod(reportPeriod);

    let query = client.from("actual_data").select("*").eq("period_type", period_type).eq("period_value", period_value);

    if (storeId === 全部门店值) {
      const activeIds = await fetchActiveStoreIds();
      if (!activeIds.length) return null;
      query = query.in("store_id", activeIds);
    } else {
      const activeIds = await fetchActiveStoreIds();
      if (!activeIds.includes(storeId)) return null;
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;

    if (error) {
      return null;
    }

    if (!data?.length) {
      return null;
    }

    let revenueSum = 0;
    let roomsAvailableSum = 0;
    let roomsSoldSum = 0;
    let roomRevenueSum = 0;

    for (const raw of data) {
      const row = raw as Record<string, unknown>;
      revenueSum += num(row.revenue);
      roomsAvailableSum += num(row.rooms_available);
      roomsSoldSum += num(row.rooms_sold);
      roomRevenueSum += rowRoomRevenue(row);
    }

    const occupancy_rate = roomsAvailableSum > 0 ? roomsSoldSum / roomsAvailableSum : null;

    const roomRevenueYuan = roomRevenueSum * 10000;

    const adr = roomsSoldSum > 0 && roomRevenueYuan > 0 ? roomRevenueYuan / roomsSoldSum : null;

    const revpar = roomsAvailableSum > 0 && roomRevenueYuan > 0 ? roomRevenueYuan / roomsAvailableSum : null;

    if (revenueSum === 0) {
      return null;
    }

    return {
      revenue: revenueSum,
      occupancy_rate,
      adr,
      revpar
    };
  } catch {
    return null;
  }
}

export interface DashboardTrendPoint {
  /** 与 DB `period_value` 对齐，如 2026-04、2026-Q2、2026 */
  周期: string;
  /** 金额单位：万元 */
  收入: number;
  /** 金额单位：万元 */
  成本: number;
  /** 金额单位：万元 */
  利润: number;
}

export type BoardTypeFilter = "all" | "hotelBoard" | "restaurantBoard";

/**
 * 收入/成本/利润趋势：
 * - 单店从该店 opening_period 起算；
 * - 全部门店聚合时每店仅在开业后账期参与；
 * - 不补 0、不强行凑满 6 期。
 */
export async function getTrendSeriesFromSupabase(
  storeId: string,
  boardType: BoardTypeFilter,
  reportPeriod: ReportPeriod
): Promise<DashboardTrendPoint[] | null> {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasEnv) return null;

  const currentDb = reportPeriodToDbPeriod(reportPeriod);
  const periodValues: string[] = [];
  const period_type = currentDb.period_type;

  try {
    const client = getSupabaseClient();

    let query = client
      .from("actual_data")
      .select(
        `
  period_value,
  revenue,
  total_cost,
  profit,
  store_id,
  stores(store_type, name)
`
      )
      .eq("period_type", period_type);

    if (storeId === 全部门店值) {
      const activeIds = await fetchActiveStoreIds();
      if (!activeIds.length) return null;
      query = query.in("store_id", activeIds);
      const { data: storeRows } = await client.from("stores").select("id,name").in("id", activeIds);
      const periods = trendPeriodsForAllStores(
        currentDb,
        (storeRows ?? []).map((s) => ({ store_id: String((s as Record<string, unknown>).id ?? ""), store_name: String((s as Record<string, unknown>).name ?? "") })),
        6
      );
      periodValues.push(...periods.map((p) => p.period_value));
    } else if (storeId) {
      const activeIds = await fetchActiveStoreIds();
      if (!activeIds.includes(storeId)) return null;
      query = query.eq("store_id", storeId);
      const { data: storeRow } = await client.from("stores").select("id,name").eq("id", storeId).maybeSingle();
      const periods = trendPeriodsForSingleStore(
        currentDb,
        storeId,
        String((storeRow as Record<string, unknown> | null)?.name ?? ""),
        6
      );
      periodValues.push(...periods.map((p) => p.period_value));
    }
    if (!periodValues.length) return null;
    query = query.in("period_value", periodValues);

    const { data, error } = await query;

    if (error) return null;
    if (!data?.length) return null;

    const byPeriod: Record<string, { revenueSum: number; costSum: number; profitSum: number }> = {};

    for (const raw of data) {
      const row = raw as Record<string, unknown>;
      const storeType = ((row.stores as { store_type?: unknown } | null) ?? {}).store_type;

      const periodValue = String(row.period_value ?? "");
      if (!periodValue) continue;
      if (boardType === "hotelBoard" && storeType !== "酒店") continue;
      if (boardType === "restaurantBoard" && storeType !== "餐饮") continue;

      if (!isStoreOpenInPeriod(String(row.store_id ?? ""), String(((row.stores as { name?: unknown } | null) ?? {}).name ?? ""), periodValue)) {
        continue;
      }
      if (!byPeriod[periodValue]) {
        byPeriod[periodValue] = { revenueSum: 0, costSum: 0, profitSum: 0 };
      }

      byPeriod[periodValue].revenueSum += num(row.revenue);
      byPeriod[periodValue].costSum += getTotalCost(row);
      byPeriod[periodValue].profitSum += rowProfit(row);
    }

    const result: DashboardTrendPoint[] = periodValues
      .filter((pv) => byPeriod[pv])
      .map((pv) => {
        const entry = byPeriod[pv]!;
        return {
          周期: pv,
          收入: entry.revenueSum,
          成本: entry.costSum,
          利润: entry.profitSum
        };
      });

    return result.length ? result : null;
  } catch {
    return null;
  }
}

export type StoreRankingGroup = "all" | "hotelBoard" | "restaurantBoard";

export interface DashboardStoreRankingRow {
  store_id: string;
  store_name: string;
  revenue: number;
  profit: number;
  profit_margin: number;
}

export interface CockpitTotals {
  revenue: number;
  totalCost: number;
  profit: number;
  roomsSold: number;
  roomsAvailable: number;
  roomRevenueWan: number;
}

export interface CockpitSnapshot {
  current: CockpitTotals;
  previous: CockpitTotals;
  yearAgo: CockpitTotals;
  structure: {
    hotelRevenue: number;
    restaurantRevenue: number;
    /** 业态未识别或非酒店餐饮时归入 */
    otherRevenue: number;
    hotelCost: number;
    restaurantCost: number;
    otherCost: number;
  };
}

export interface CockpitStoreRankingRow {
  store_id: string;
  store_name: string;
  store_type_label: "酒店" | "餐饮" | "其他";
  revenue: number;
  profit: number;
  profit_margin: number;
  total_cost: number;
  mom_profit_change_pct: number;
  revpar: number | null;
}

function nullableNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeStoreType(raw: unknown): "酒店" | "餐饮" | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  if (s === "酒店" || s === "hotel") return "酒店";
  if (s === "餐饮" || s === "restaurant" || s === "catering") return "餐饮";
  return null;
}

function storeTypeLabel(raw: unknown): "酒店" | "餐饮" | "其他" {
  const n = normalizeStoreType(raw);
  return n ?? "其他";
}

function emptyTotals(): CockpitTotals {
  return { revenue: 0, totalCost: 0, profit: 0, roomsSold: 0, roomsAvailable: 0, roomRevenueWan: 0 };
}

function aggregateRowsToTotals(rows: Record<string, unknown>[]): CockpitTotals {
  const t = emptyTotals();
  for (const row of rows) {
    t.revenue += num(row.revenue);
    t.totalCost += getTotalCost(row);
    t.profit += rowProfit(row);
    t.roomsSold += num(row.rooms_sold);
    t.roomsAvailable += num(row.rooms_available);
    t.roomRevenueWan += rowRoomRevenue(row);
  }
  return t;
}

/**
 * 老板驾驶舱：当前 / 上期 / 去年同期聚合 + 当期酒店餐饮收入成本结构
 */
export async function getCockpitSnapshotFromSupabase(
  storeId: string,
  boardType: BoardTypeFilter,
  reportPeriod: ReportPeriod
): Promise<CockpitSnapshot | null> {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasEnv) return null;

  try {
    const client = getSupabaseClient();
    const cur = reportPeriodToDbPeriod(reportPeriod);
    const prev = getPreviousPeriod(cur.period_type, cur.period_value);
    const ya = getYearAgoPeriod(cur.period_type, cur.period_value);

    const { data: storesData, error: storesError } = await client.from("stores").select("id,name,store_type");
    if (storesError || !storesData?.length) return null;

    const storeRows = storesData.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        store_id: String(r.id ?? ""),
        store_name: String(r.name ?? ""),
        normalizedType: normalizeStoreType(r.store_type),
        label: storeTypeLabel(r.store_type)
      };
    });

    let eligible = storeRows.filter((s) => s.store_id && isActiveStore({ name: s.store_name, label: s.store_name }));
    if (boardType === "hotelBoard") eligible = eligible.filter((s) => s.normalizedType === "酒店");
    if (boardType === "restaurantBoard") eligible = eligible.filter((s) => s.normalizedType === "餐饮");
    if (storeId !== 全部门店值) {
      eligible = eligible.filter((s) => s.store_id === storeId);
    }

    const storeIds = eligible.map((s) => s.store_id);
    if (!storeIds.length) return null;

    const typeById: Record<string, "酒店" | "餐饮" | "其他"> = {};
    for (const s of eligible) typeById[s.store_id] = s.label;

    const pvList = [cur.period_value, prev.period_value, ya.period_value];
    const { data: actualRows, error: actualError } = await client
      .from("actual_data")
      .select("*")
      .eq("period_type", cur.period_type)
      .in("period_value", pvList)
      .in("store_id", storeIds);

    if (actualError || !actualRows?.length) return null;

    const byPv: Record<string, Record<string, unknown>[]> = {};
    for (const raw of actualRows) {
      const row = raw as Record<string, unknown>;
      const pv = String(row.period_value ?? "");
      if (!byPv[pv]) byPv[pv] = [];
      byPv[pv].push(row);
    }

    const currentRows = byPv[cur.period_value] ?? [];
    const previousRows = byPv[prev.period_value] ?? [];
    const yearAgoRows = byPv[ya.period_value] ?? [];

    if (!currentRows.length) return null;

    const current = aggregateRowsToTotals(currentRows);
    const previous = aggregateRowsToTotals(previousRows);
    const yearAgo = aggregateRowsToTotals(yearAgoRows);

    let hotelRevenue = 0;
    let restaurantRevenue = 0;
    let otherRevenue = 0;
    let hotelCost = 0;
    let restaurantCost = 0;
    let otherCost = 0;
    for (const row of currentRows) {
      const sid = String(row.store_id ?? "");
      const typ = typeById[sid] ?? "其他";
      const rev = num(row.revenue);
      const cst = getTotalCost(row);
      if (typ === "酒店") {
        hotelRevenue += rev;
        hotelCost += cst;
      } else if (typ === "餐饮") {
        restaurantRevenue += rev;
        restaurantCost += cst;
      } else {
        otherRevenue += rev;
        otherCost += cst;
      }
    }

    return {
      current,
      previous,
      yearAgo,
      structure: { hotelRevenue, restaurantRevenue, otherRevenue, hotelCost, restaurantCost, otherCost }
    };
  } catch {
    return null;
  }
}

/**
 * 门店排名（收入/成本/利润维度的简化聚合）
 */
export async function getStoreRankingFromSupabase(
  reportPeriod: ReportPeriod,
  rankGroup: StoreRankingGroup
): Promise<DashboardStoreRankingRow[] | null> {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasEnv) return null;

  try {
    const client = getSupabaseClient();
    const { period_type, period_value } = reportPeriodToActualDataPeriod(reportPeriod);

    const { data: storesData, error: storesError } = await client
      .from("stores")
      .select("id,name,brand,city,store_type");

    if (storesError) return null;
    if (!storesData?.length) return null;

    const storeTypeFiltered = storesData
      .map((row) => {
        const r = row as Record<string, unknown>;
        const store_id = String(r.id ?? "");
        const store_name = String(r.name ?? "");
        const normalizedType = normalizeStoreType(r.store_type);
        return { store_id, store_name, normalizedType };
      })
      .filter((s) => s.store_id && s.store_name && isActiveStore({ name: s.store_name, label: s.store_name }));

    const eligibleStores =
      rankGroup === "all"
        ? storeTypeFiltered
        : rankGroup === "hotelBoard"
          ? storeTypeFiltered.filter((s) => s.normalizedType === "酒店")
          : storeTypeFiltered.filter((s) => s.normalizedType === "餐饮");

    const storeIds = eligibleStores.map((s) => s.store_id);
    if (!storeIds.length) return null;

    const { data: actualRows, error: actualError } = await client
      .from("actual_data")
      .select("store_id,revenue,profit,total_cost")
      .eq("period_type", period_type)
      .eq("period_value", period_value)
      .in("store_id", storeIds);

    if (actualError) return null;
    if (!actualRows?.length) return null;

    type Acc = {
      revenueSum: number;
      revenueHasValue: boolean;
      totalCostSum: number;
      totalCostHasValue: boolean;
      profitSum: number;
      profitHasValue: boolean;
    };

    const accByStore: Record<string, Acc> = {};
    for (const raw of actualRows) {
      const row = raw as Record<string, unknown>;
      const sid = String(row.store_id ?? "");
      if (!sid) continue;

      if (!accByStore[sid]) {
        accByStore[sid] = {
          revenueSum: 0,
          revenueHasValue: false,
          totalCostSum: 0,
          totalCostHasValue: false,
          profitSum: 0,
          profitHasValue: false
        };
      }

      const revenueV = nullableNum(row.revenue);
      if (revenueV != null) {
        accByStore[sid].revenueSum += revenueV;
        accByStore[sid].revenueHasValue = true;
      }

      const profitV = nullableNum(row.profit);
      if (profitV != null) {
        accByStore[sid].profitSum += profitV;
        accByStore[sid].profitHasValue = true;
      }

      const totalCostV = nullableNum(row.total_cost);
      if (totalCostV != null) {
        accByStore[sid].totalCostSum += totalCostV;
        accByStore[sid].totalCostHasValue = true;
      }
    }

    const nameById: Record<string, string> = {};
    for (const s of eligibleStores) nameById[s.store_id] = s.store_name;

    const result: DashboardStoreRankingRow[] = [];
    for (const sid of Object.keys(accByStore)) {
      const a = accByStore[sid]!;
      if (!a.revenueHasValue) continue;

      const revenue = a.revenueSum;
      if (!Number.isFinite(revenue) || revenue <= 0) continue;

      let profit: number | null = null;
      if (a.profitHasValue) {
        profit = a.profitSum;
      } else if (a.totalCostHasValue) {
        profit = a.revenueSum - a.totalCostSum;
      }

      if (profit == null || !Number.isFinite(profit)) continue;

      result.push({
        store_id: sid,
        store_name: nameById[sid] ?? sid,
        revenue,
        profit,
        profit_margin: profit / revenue
      });
    }

    if (!result.length) return null;
    result.sort((a, b) => b.revenue - a.revenue);
    return result;
  } catch {
    return null;
  }
}

/**
 * 驾驶舱门店排行：含业态、利润环比、酒店 RevPAR（可空）
 */
export async function getStoreCockpitRankingFromSupabase(
  reportPeriod: ReportPeriod,
  rankGroup: StoreRankingGroup
): Promise<CockpitStoreRankingRow[] | null> {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasEnv) return null;

  try {
    const client = getSupabaseClient();
    const cur = reportPeriodToDbPeriod(reportPeriod);
    const prev = getPreviousPeriod(cur.period_type, cur.period_value);

    const { data: storesData, error: storesError } = await client.from("stores").select("id,name,store_type");
    if (storesError || !storesData?.length) return null;

    const eligibleStores = storesData
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          store_id: String(r.id ?? ""),
          store_name: String(r.name ?? ""),
          normalizedType: normalizeStoreType(r.store_type),
          label: storeTypeLabel(r.store_type)
        };
      })
      .filter((s) => s.store_id && s.store_name && isActiveStore({ name: s.store_name, label: s.store_name }));

    const filtered =
      rankGroup === "all"
        ? eligibleStores
        : rankGroup === "hotelBoard"
          ? eligibleStores.filter((s) => s.normalizedType === "酒店")
          : eligibleStores.filter((s) => s.normalizedType === "餐饮");

    const storeIds = filtered.map((s) => s.store_id);
    if (!storeIds.length) return null;

    const { data: curRows, error: e1 } = await client
      .from("actual_data")
      .select("*")
      .eq("period_type", cur.period_type)
      .eq("period_value", cur.period_value)
      .in("store_id", storeIds);
    if (e1 || !curRows?.length) return null;

    const { data: prevRows } = await client
      .from("actual_data")
      .select("*")
      .eq("period_type", prev.period_type)
      .eq("period_value", prev.period_value)
      .in("store_id", storeIds);

    const prevByStore: Record<string, Record<string, unknown>[]> = {};
    for (const raw of prevRows ?? []) {
      const row = raw as Record<string, unknown>;
      const sid = String(row.store_id ?? "");
      if (!prevByStore[sid]) prevByStore[sid] = [];
      prevByStore[sid].push(row);
    }

    const curByStore: Record<string, Record<string, unknown>[]> = {};
    for (const raw of curRows) {
      const row = raw as Record<string, unknown>;
      const sid = String(row.store_id ?? "");
      if (!curByStore[sid]) curByStore[sid] = [];
      curByStore[sid].push(row);
    }

    const metaById: Record<string, { name: string; label: "酒店" | "餐饮" | "其他" }> = {};
    for (const s of filtered) metaById[s.store_id] = { name: s.store_name, label: s.label };

    const out: CockpitStoreRankingRow[] = [];

    for (const sid of Object.keys(curByStore)) {
      const meta = metaById[sid];
      if (!meta) continue;

      const cAgg = aggregateRowsToTotals(curByStore[sid]!);
      const pAgg = aggregateRowsToTotals(prevByStore[sid] ?? []);

      if (cAgg.revenue <= 0) continue;

      const profit_margin = cAgg.revenue > 0 ? cAgg.profit / cAgg.revenue : 0;
      const pp = pAgg.profit;
      const cp = cAgg.profit;
      const mom_profit_change_pct = calcChange(cp, pp);

      let revpar: number | null = null;
      if (meta.label === "酒店" && cAgg.roomsAvailable > 0) {
        revpar = calcRevPAR(cAgg.roomRevenueWan, cAgg.roomsAvailable);
      }

      out.push({
        store_id: sid,
        store_name: meta.name,
        store_type_label: meta.label,
        revenue: cAgg.revenue,
        profit: cAgg.profit,
        profit_margin,
        total_cost: cAgg.totalCost,
        mom_profit_change_pct,
        revpar
      });
    }

    return out.length ? out : null;
  } catch {
    return null;
  }
}

/** actual_data 行 + 关联门店（用于异常预警、资产分析） */
export type ActualDataRowWithStore = Record<string, unknown> & {
  store_id: string;
  stores?: { name?: string | null; store_type?: string | null } | null;
};

/**
 * 读取指定账期下 actual_data 全量列；无环境或出错时返回空数组。
 * - `全部门店值`：仅 active stores（`.in(store_id, …)`）
 * - `string`：单店 store_id（Supabase UUID）
 * - `string[]`：多店 `.in('store_id', …)`，自动剔除非 active 门店
 */
export async function getActualDataRowsForPeriodWithStores(
  reportPeriod: ReportPeriod,
  storeScope: ActualDataStoreScope
): Promise<ActualDataRowWithStore[]> {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasEnv) return [];
  const resolved = await resolveActualDataStoreScope(storeScope);
  if (Array.isArray(resolved) && resolved.length === 0) return [];
  try {
    const client = getSupabaseClient();
    const { period_type, period_value } = reportPeriodToActualDataPeriod(reportPeriod);
    let q = client
      .from("actual_data")
      .select("*, stores(name, store_type)")
      .eq("period_type", period_type)
      .eq("period_value", period_value);
    if (Array.isArray(resolved)) {
      q = q.in("store_id", [...resolved]);
    } else {
      q = q.eq("store_id", resolved);
    }
    const { data, error } = await q;
    if (error) return [];
    return ((data ?? []) as ActualDataRowWithStore[]) ?? [];
  } catch {
    return [];
  }
}
