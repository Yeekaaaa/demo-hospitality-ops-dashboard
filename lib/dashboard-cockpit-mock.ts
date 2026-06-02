/**
 * 经营驾驶舱 mock / fallback 数据（与 Supabase 结构对齐，避免无数据时白屏）
 */

import type { ActualOverrideMap } from "@/lib/actual-overrides";
import {
  calcChange,
  dbPeriodToReportPeriod,
  getPreviousPeriod,
  getYearAgoPeriod,
  reportPeriodToDbPeriod,
  safeNumber
} from "@/lib/dashboard-metrics";
import {
  isStoreOpenInPeriod,
  trendPeriodsForAllStores,
  trendPeriodsForSingleStore
} from "@/lib/trend-periods";
import { getActualAggregatedByStoreIds, getDashboardKpis, type ReportPeriod } from "@/lib/mock-analytics";
import { filterActiveMockStores } from "@/lib/active-store-scope";
import {
  全部门店值,
  getHotelStores,
  getRestaurantStores,
  type StoreMaster
} from "@/lib/store-master";
import type {
  CockpitSnapshot,
  CockpitStoreRankingRow,
  CockpitTotals,
  DashboardTrendPoint
} from "@/src/lib/dashboard-data-service";

export type BoardType = "all" | "hotelBoard" | "restaurantBoard";

function totalCostFromActual(a: {
  人力成本: number;
  能源费用: number;
  华住管理费: number;
  客房服务成本: number;
  非客房服务成本: number;
  原材料成本: number;
}): number {
  return (
    safeNumber(a.人力成本) +
    safeNumber(a.能源费用) +
    safeNumber(a.华住管理费) +
    safeNumber(a.客房服务成本) +
    safeNumber(a.非客房服务成本) +
    safeNumber(a.原材料成本)
  );
}

/** 与看板、顶部门店筛选对齐的 mock 门店 id 列表 */
export function resolveEligibleMockStoreIds(storeId: string, boardType: BoardType): string[] {
  let pool: StoreMaster[] = filterActiveMockStores();
  if (boardType === "hotelBoard") pool = getHotelStores();
  else if (boardType === "restaurantBoard") pool = getRestaurantStores();

  if (storeId !== 全部门店值 && filterActiveMockStores().some((s) => s.id === storeId)) {
    const one = pool.filter((s) => s.id === storeId);
    return one.length ? one.map((s) => s.id) : [storeId];
  }
  return pool.map((s) => s.id);
}

function mockKpisScopeForIds(ids: string[]): string {
  if (ids.length === 0) return 全部门店值;
  if (ids.length === 1) return ids[0]!;
  return 全部门店值;
}

function buildTotalsFromFinancial(
  a: ReturnType<typeof getActualAggregatedByStoreIds>,
  period: ReportPeriod,
  mockKpisScope: string,
  actualOverrides?: ActualOverrideMap
): CockpitTotals {
  const revenue = safeNumber(a.营业收入);
  const profit = safeNumber(a.营业利润);
  const totalCost = totalCostFromActual(a);
  /** 客房收入（元）；字段名 roomRevenueWan 为历史命名 */
  const roomRevenueWan = safeNumber(a.客房收入);
  const hotelCount = resolveEligibleMockStoreIds(mockKpisScope, "hotelBoard").length;
  const kpis = getDashboardKpis(mockKpisScope, period, actualOverrides);

  let roomsAvailable = 0;
  let roomsSold = 0;
  if (hotelCount > 0 && kpis.入住率 != null && kpis.revpar != null) {
    roomsAvailable = Math.max(100, Math.round(roomRevenueWan / Math.max(1, kpis.revpar)));
    roomsSold = Math.round(roomsAvailable * safeNumber(kpis.入住率));
  } else if (hotelCount > 0) {
    roomsAvailable = hotelCount * 120;
    roomsSold = Math.round(roomsAvailable * 0.8);
  }

  return {
    revenue,
    totalCost,
    profit,
    roomsSold,
    roomsAvailable,
    roomRevenueWan
  };
}

function sumStructure(
  ids: string[],
  period: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): CockpitSnapshot["structure"] {
  const hotels = getHotelStores().filter((s) => ids.includes(s.id));
  const rests = getRestaurantStores().filter((s) => ids.includes(s.id));
  const covered = new Set([...hotels.map((s) => s.id), ...rests.map((s) => s.id)]);
  let hotelRevenue = 0;
  let restaurantRevenue = 0;
  let otherRevenue = 0;
  let hotelCost = 0;
  let restaurantCost = 0;
  let otherCost = 0;
  for (const s of hotels) {
    const a = getActualAggregatedByStoreIds([s.id], period, actualOverrides);
    hotelRevenue += safeNumber(a.营业收入);
    hotelCost += totalCostFromActual(a);
  }
  for (const s of rests) {
    const a = getActualAggregatedByStoreIds([s.id], period, actualOverrides);
    restaurantRevenue += safeNumber(a.营业收入);
    restaurantCost += totalCostFromActual(a);
  }
  for (const id of ids) {
    if (covered.has(id)) continue;
    const a = getActualAggregatedByStoreIds([id], period, actualOverrides);
    otherRevenue += safeNumber(a.营业收入);
    otherCost += totalCostFromActual(a);
  }
  return { hotelRevenue, restaurantRevenue, otherRevenue, hotelCost, restaurantCost, otherCost };
}

export function getMockCockpitTrendSeries(
  storeId: string,
  boardType: BoardType,
  reportPeriod: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): DashboardTrendPoint[] {
  const ids = resolveEligibleMockStoreIds(storeId, boardType);
  const current = reportPeriodToDbPeriod(reportPeriod);
  const idList = ids.length ? ids : filterActiveMockStores().map((s) => s.id);
  const periods =
    storeId === 全部门店值
      ? trendPeriodsForAllStores(
          current,
          idList.map((id) => ({ store_id: id, store_name: filterActiveMockStores().find((s) => s.id === id)?.显示名称 })),
          6
        )
      : trendPeriodsForSingleStore(
          current,
          storeId,
          filterActiveMockStores().find((s) => s.id === storeId)?.显示名称,
          6
        );
  return periods.map((dbp) => {
    const rp = dbPeriodToReportPeriod(dbp);
    const openIds = idList.filter((id) =>
      isStoreOpenInPeriod(id, filterActiveMockStores().find((s) => s.id === id)?.显示名称, dbp.period_value)
    );
    if (!openIds.length) return null;
    const a = getActualAggregatedByStoreIds(openIds, rp, actualOverrides);
    return {
      周期: dbp.period_value,
      收入: safeNumber(a.营业收入),
      成本: totalCostFromActual(a),
      利润: safeNumber(a.营业利润)
    };
  }).filter((v): v is DashboardTrendPoint => v != null);
}

export function buildMockCockpitSnapshot(
  storeId: string,
  boardType: BoardType,
  reportPeriod: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): CockpitSnapshot {
  const ids = resolveEligibleMockStoreIds(storeId, boardType);
  const effectiveIds = ids.length ? ids : filterActiveMockStores().map((s) => s.id);
  const mockScope = mockKpisScopeForIds(effectiveIds);

  const d0 = reportPeriodToDbPeriod(reportPeriod);
  const prevP = dbPeriodToReportPeriod(getPreviousPeriod(d0.period_type, d0.period_value));
  const yaP = dbPeriodToReportPeriod(getYearAgoPeriod(d0.period_type, d0.period_value));

  const curA = getActualAggregatedByStoreIds(effectiveIds, reportPeriod, actualOverrides);
  const prevA = getActualAggregatedByStoreIds(effectiveIds, prevP, actualOverrides);
  const yaA = getActualAggregatedByStoreIds(effectiveIds, yaP, actualOverrides);

  const current = buildTotalsFromFinancial(curA, reportPeriod, mockScope, actualOverrides);
  const previous = buildTotalsFromFinancial(prevA, prevP, mockScope, actualOverrides);
  const yearAgo = buildTotalsFromFinancial(yaA, yaP, mockScope, actualOverrides);
  const structure = sumStructure(effectiveIds, reportPeriod, actualOverrides);

  return { current, previous, yearAgo, structure };
}

export function getMockCockpitStoreRanking(
  storeId: string,
  boardType: BoardType,
  rankGroup: "all" | "hotel" | "restaurant",
  reportPeriod: ReportPeriod,
  prevReportPeriod: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): CockpitStoreRankingRow[] {
  const ids = resolveEligibleMockStoreIds(storeId, boardType);
  const pool = filterActiveMockStores().filter((s) => {
    if (!ids.includes(s.id)) return false;
    if (boardType === "hotelBoard" && s.业态 !== "酒店") return false;
    if (boardType === "restaurantBoard" && s.业态 !== "餐饮") return false;
    if (rankGroup === "hotel") return s.业态 === "酒店";
    if (rankGroup === "restaurant") return s.业态 === "餐饮";
    return true;
  });
  const rows: CockpitStoreRankingRow[] = [];

  for (const s of pool) {
    const cur = getActualAggregatedByStoreIds([s.id], reportPeriod, actualOverrides);
    const prev = getActualAggregatedByStoreIds([s.id], prevReportPeriod, actualOverrides);
    const revenue = safeNumber(cur.营业收入);
    const profit = safeNumber(cur.营业利润);
    const prevProfit = safeNumber(prev.营业利润);
    const totalCost = totalCostFromActual(cur);
    const profitMargin = revenue > 0 ? profit / revenue : 0;
    const momProfitPct = calcChange(profit, prevProfit);

    const kpis = getDashboardKpis(s.id, reportPeriod, actualOverrides);
    let revpar: number | null = null;
    if (s.业态 === "酒店" && kpis.revpar != null) {
      revpar = safeNumber(kpis.revpar);
    }

    rows.push({
      store_id: s.id,
      store_name: s.显示名称,
      store_type_label: s.业态,
      revenue,
      profit,
      profit_margin: profitMargin,
      total_cost: totalCost,
      mom_profit_change_pct: momProfitPct,
      revpar
    });
  }

  return rows.filter((r) => r.revenue > 0);
}
