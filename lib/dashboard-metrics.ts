/**
 * 经营驾驶舱纯计算与账期工具（无 Supabase / UI 依赖）
 */

import type { ReportPeriod } from "@/lib/mock-analytics";

export type DbPeriodType = "month" | "quarter" | "year";

export type DbPeriod = { period_type: DbPeriodType; period_value: string };

export function safeNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function calcProfitMargin(revenue: number, profit: number): number {
  if (!Number.isFinite(revenue) || revenue === 0) return 0;
  return (profit / revenue) * 100;
}

export function calcOccupancyRate(roomsSold: number, roomsAvailable: number): number {
  if (!Number.isFinite(roomsAvailable) || roomsAvailable === 0) return 0;
  return (roomsSold / roomsAvailable) * 100;
}

/** roomRevenue 单位：元（参数名 roomRevenueWan 为历史命名）；返回元/可售间夜 */
export function calcRevPAR(roomRevenueWan: number, roomsAvailable: number): number {
  if (!Number.isFinite(roomsAvailable) || roomsAvailable === 0) return 0;
  return safeNumber(roomRevenueWan) / roomsAvailable;
}

export function calcChange(current: number, previous: number): number {
  if (!Number.isFinite(current)) current = 0;
  if (!Number.isFinite(previous)) previous = 0;
  if (previous === 0 && current === 0) return 0;
  if (previous === 0 && current !== 0) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type TrendDirection = "up" | "down" | "flat";

export function getTrendDirection(change: number): TrendDirection {
  if (!Number.isFinite(change)) return "flat";
  if (change > 0.1) return "up";
  if (change < -0.1) return "down";
  return "flat";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function reportPeriodToDbPeriod(r: ReportPeriod): DbPeriod {
  if (r.粒度 === "month") {
    const m = r.月 ?? 1;
    return { period_type: "month", period_value: `${r.年}-${pad2(m)}` };
  }
  if (r.粒度 === "quarter") {
    const q = r.季 ?? 1;
    return { period_type: "quarter", period_value: `${r.年}-Q${q}` };
  }
  return { period_type: "year", period_value: String(r.年) };
}

export function dbPeriodToReportPeriod(p: DbPeriod): ReportPeriod {
  if (p.period_type === "month") {
    const m = p.period_value.match(/^(\d{4})-(\d{2})$/);
    if (!m) return { 粒度: "month", 年: new Date().getFullYear(), 月: 1 };
    return { 粒度: "month", 年: Number(m[1]), 月: Number(m[2]) };
  }
  if (p.period_type === "quarter") {
    const m = p.period_value.match(/^(\d{4})-Q([1-4])$/);
    if (!m) return { 粒度: "quarter", 年: new Date().getFullYear(), 季: 1 };
    return { 粒度: "quarter", 年: Number(m[1]), 季: Number(m[2]) as 1 | 2 | 3 | 4 };
  }
  const y = Number(p.period_value);
  return { 粒度: "year", 年: Number.isFinite(y) ? y : new Date().getFullYear() };
}

export function getPreviousPeriod(periodType: DbPeriodType, periodValue: string): DbPeriod {
  if (periodType === "month") {
    const m = periodValue.match(/^(\d{4})-(\d{2})$/);
    if (!m) return { period_type: "month", period_value: periodValue };
    let y = Number(m[1]);
    let mo = Number(m[2]);
    if (mo <= 1) {
      y -= 1;
      mo = 12;
    } else {
      mo -= 1;
    }
    return { period_type: "month", period_value: `${y}-${pad2(mo)}` };
  }
  if (periodType === "quarter") {
    const m = periodValue.match(/^(\d{4})-Q([1-4])$/);
    if (!m) return { period_type: "quarter", period_value: periodValue };
    const y = Number(m[1]);
    const q = Number(m[2]) as 1 | 2 | 3 | 4;
    if (q <= 1) {
      return { period_type: "quarter", period_value: `${y - 1}-Q4` };
    }
    return { period_type: "quarter", period_value: `${y}-Q${q - 1}` };
  }
  const y = Number(periodValue);
  const ny = Number.isFinite(y) ? y - 1 : new Date().getFullYear() - 1;
  return { period_type: "year", period_value: String(ny) };
}

export function getYearAgoPeriod(periodType: DbPeriodType, periodValue: string): DbPeriod {
  if (periodType === "month") {
    const m = periodValue.match(/^(\d{4})-(\d{2})$/);
    if (!m) return { period_type: "month", period_value: periodValue };
    return { period_type: "month", period_value: `${Number(m[1]) - 1}-${m[2]}` };
  }
  if (periodType === "quarter") {
    const m = periodValue.match(/^(\d{4})-Q([1-4])$/);
    if (!m) return { period_type: "quarter", period_value: periodValue };
    return { period_type: "quarter", period_value: `${Number(m[1]) - 1}-Q${m[2]}` };
  }
  const y = Number(periodValue);
  const ny = Number.isFinite(y) ? y - 1 : new Date().getFullYear() - 1;
  return { period_type: "year", period_value: String(ny) };
}

/** 从当前账期向前共 n 个周期（含当前），按时间正序（最旧 → 最新） */
export function getLastNDbPeriodsOldestFirst(current: DbPeriod, n: number): DbPeriod[] {
  const newestFirst: DbPeriod[] = [current];
  let p = current;
  for (let i = 1; i < n; i++) {
    p = getPreviousPeriod(p.period_type, p.period_value);
    newestFirst.push(p);
  }
  return newestFirst.reverse();
}

export function getPreviousReportPeriod(r: ReportPeriod): ReportPeriod {
  const cur = reportPeriodToDbPeriod(r);
  return dbPeriodToReportPeriod(getPreviousPeriod(cur.period_type, cur.period_value));
}

export function getYearAgoReportPeriod(r: ReportPeriod): ReportPeriod {
  const cur = reportPeriodToDbPeriod(r);
  return dbPeriodToReportPeriod(getYearAgoPeriod(cur.period_type, cur.period_value));
}

export function formatPctOneDecimal(n: number): string {
  if (!Number.isFinite(n)) return "0.0%";
  return `${n.toFixed(1)}%`;
}
