/**
 * actual_data 经营科目 → 驾驶舱 CockpitSnapshot（仅当期；环比/同比需 Supabase 多期聚合）
 */

import type { CockpitSnapshot, CockpitTotals } from "@/src/lib/dashboard-data-service";

function emptyTotals(): CockpitTotals {
  return { revenue: 0, totalCost: 0, profit: 0, roomsSold: 0, roomsAvailable: 0, roomRevenueWan: 0 };
}

function totalsFromOperatingSubjects(os: Record<string, number>): CockpitTotals {
  const revenue = os["营业收入"] ?? 0;
  const cost = os["总成本"] ?? 0;
  const profit = os["运营利润"] ?? os["利润"] ?? revenue - cost;
  const roomsSold = os["已售房晚"] ?? 0;
  const roomsAvailable = os["可售房晚"] ?? 0;
  const roomRevenueWan = os["客房收入"] ?? 0;
  return {
    revenue,
    totalCost: cost,
    profit,
    roomsSold,
    roomsAvailable,
    roomRevenueWan
  };
}

/** 仅有当期 actual_data 科目时，构造可展示的驾驶舱快照（上期/去年为空） */
export function cockpitSnapshotFromOperatingSubjects(
  operatingSubjects: Record<string, number>
): CockpitSnapshot {
  const current = totalsFromOperatingSubjects(operatingSubjects);
  return {
    current,
    previous: emptyTotals(),
    yearAgo: emptyTotals(),
    structure: {
      hotelRevenue: 0,
      restaurantRevenue: 0,
      otherRevenue: 0,
      hotelCost: 0,
      restaurantCost: 0,
      otherCost: 0
    }
  };
}
