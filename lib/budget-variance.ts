/**
 * 预算 vs 实际：完整科目差异、状态与管理话术
 */

import { filterActiveMockStores } from "@/lib/active-store-scope";
import {
  formatWan,
  getActualAggregated,
  getActualAggregatedByStoreIds,
  getBudgetAggregatedByStoreIds,
  getBudgetForScope,
  getBudgetHotelOperationsKpisForStoreIds,
  getHotelOperationsKpis,
  getHotelOperationsKpisForStoreIds,
  getRestaurantOperationsKpis,
  type FinancialLineActual,
  type ReportPeriod
} from "@/lib/mock-analytics";
import type { ActualOverrideMap } from "@/lib/actual-overrides";
import { buildBudgetStorageKey, type BudgetOverrideMap } from "@/lib/budget-overrides";
import { DEFAULT_BUDGET_VERSION, type BudgetVersionValue } from "@/lib/budget-versions";
import {
  BUDGET_SUBJECT_CATALOG,
  type BudgetSubjectDefinition,
  type BudgetSubjectDirection
} from "@/lib/budget-subjects";
import { getFullBudgetSubjectCatalog } from "@/lib/operating-budget-subjects";
import { getStoreById, getHotelStores, getRestaurantStores, 全部门店值 } from "@/lib/store-master";
import { reportPeriodToDbPeriod } from "@/lib/dashboard-metrics";
import { isStoreOpenInPeriod, trendPeriodsForAllStores, trendPeriodsForSingleStore } from "@/lib/trend-periods";

export type BudgetVarianceStatus = "达标" | "未达标" | "受控" | "超支" | "低于预算" | "风险" | "—";

export type BudgetVarianceRow = {
  label: string;
  group: BudgetSubjectDefinition["group"];
  unit: string;
  direction: BudgetSubjectDirection;
  actual: number;
  budget: number;
  variance: number;
  varianceRate: number | null;
  varianceRateLabel: string;
  status: BudgetVarianceStatus;
  statusTone: "good" | "bad" | "neutral";
};

export type FullBudgetVarianceReport = {
  rows: BudgetVarianceRow[];
  hasBudgetData: boolean;
  narratives: string[];
  /** 兼容旧版利润表结构 */
  legacy: {
    实际: FinancialLineActual;
    预算: FinancialLineActual;
    差异: FinancialLineActual;
    差异率: FinancialLineActual;
  };
};

export function computeVarianceRate(budget: number, actual: number): { rate: number | null; label: string } {
  if (budget === 0 && actual === 0) return { rate: 0, label: "0.0%" };
  if (budget === 0) return { rate: null, label: "预算为0" };
  const rate = (actual - budget) / budget;
  return { rate, label: `${(rate * 100).toFixed(1)}%` };
}

export function resolveVarianceStatus(
  direction: BudgetSubjectDirection,
  variance: number,
  budget: number,
  actual: number
): { status: BudgetVarianceStatus; tone: "good" | "bad" | "neutral" } {
  if (budget === 0 && actual === 0) return { status: "—", tone: "neutral" };
  if (budget === 0 && actual !== 0) {
    if (direction === "risk") {
      return { status: "风险", tone: "bad" };
    }
    if (direction === "cost") {
      return { status: "超支", tone: "bad" };
    }
    if (direction === "revenue" || direction === "profit" || direction === "operating_high") {
      return { status: "达标", tone: "good" };
    }
    return { status: "未达标", tone: "bad" };
  }

  if (direction === "revenue" || direction === "profit" || direction === "operating_high") {
    if (variance > 0) return { status: "达标", tone: "good" };
    if (variance < 0) {
      return { status: direction === "profit" ? "低于预算" : "未达标", tone: "bad" };
    }
    return { status: "达标", tone: "neutral" };
  }
  if (direction === "cost") {
    if (variance > 0) return { status: "超支", tone: "bad" };
    if (variance < 0) return { status: "受控", tone: "good" };
    return { status: "受控", tone: "neutral" };
  }
  // risk: lower actual is better
  if (variance > 0) return { status: "风险", tone: "bad" };
  if (variance < 0) return { status: "受控", tone: "good" };
  return { status: "受控", tone: "neutral" };
}

function mapFinancialToSubjects(fin: FinancialLineActual): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of BUDGET_SUBJECT_CATALOG) {
    if (s.financialKey) {
      const v = fin[s.financialKey];
      if (typeof v === "number" && Number.isFinite(v)) {
        out[s.label] = v;
        if (s.label === "总营业收入" && s.financialKey === "营业收入") {
          out["总营业收入"] = v;
        }
      }
    }
  }
  if (fin.利润率 > 0) out["利润率"] = fin.利润率 * 100;
  return out;
}

function mapOperatingToSubjects(
  scope: string,
  period: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): Record<string, number> {
  const out: Record<string, number> = {};
  const store = scope !== 全部门店值 ? getStoreById(scope) : null;
  const isHotel = store ? store.业态 === "酒店" : getHotelStores().some((h) => h.id === scope);

  if (scope === 全部门店值 || isHotel) {
    const hotelScope = scope === 全部门店值 ? "all" : scope;
    const k = getHotelOperationsKpis(hotelScope, period, actualOverrides);
    out["可售房间数"] = k.可售间夜;
    out["已售房间数"] = k.已售间数;
    out["出租率"] = k.入住率 * 100;
    out["ADR 平均房价"] = k.平均房价;
    out["RevPAR"] = k.revpar;
  }

  if (store?.业态 === "餐饮" || (scope === 全部门店值 && getRestaurantStores().length)) {
    const restScope = scope === 全部门店值 ? getRestaurantStores()[0]!.id : scope;
    const r = getRestaurantOperationsKpis(restScope, period, actualOverrides);
    out["客流量"] = Math.round(r.营业收入 / Math.max(1, r.客单价));
    out["客单价"] = r.客单价;
    out["翻台率"] = 2;
    if (r.营业收入 > 0 && r.毛利率 > 0) {
      out["原材料成本率"] = (1 - r.毛利率) * 100 * 0.55;
    }
  }

  return out;
}

function mergeSubjectBudget(
  scope: string,
  period: ReportPeriod,
  overrides?: BudgetOverrideMap,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION,
  budgetDbSubjects?: Record<string, number>
): Record<string, number> {
  const fin = getBudgetForScope(scope, period, overrides, budgetVersion);
  const fromFin = mapFinancialToSubjects(fin);
  const key = buildBudgetStorageKey(scope, period, budgetVersion);
  const custom = overrides?.[key] ?? {};
  const merged = { ...fromFin, ...custom, ...budgetDbSubjects };
  for (const s of BUDGET_SUBJECT_CATALOG) {
    if (merged[s.label] == null && s.financialKey && fromFin[s.label] != null) {
      merged[s.label] = fromFin[s.label]!;
    }
  }
  return merged;
}

function mergeSubjectActual(
  scope: string,
  period: ReportPeriod,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap,
  actualDataSubjects?: Record<string, number>
): Record<string, number> {
  const fin = getActualAggregated(scope, period, actualOverrides);
  const fromFin = mapFinancialToSubjects(fin);
  const fromOps = mapOperatingToSubjects(scope, period, actualOverrides);
  return { ...fromFin, ...fromOps, ...actualDataSubjects };
}

function buildLegacyFromSubjects(
  budget: Record<string, number>,
  actual: Record<string, number>
): FullBudgetVarianceReport["legacy"] {
  const empty = (): FinancialLineActual => ({
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
  });

  const toFin = (src: Record<string, number>): FinancialLineActual => {
    const f = empty();
    for (const s of BUDGET_SUBJECT_CATALOG) {
      if (s.financialKey && src[s.label] != null) {
        let v = src[s.label]!;
        if (s.financialKey === "利润率") v = v / 100;
        f[s.financialKey] = v;
      }
    }
    f.营业收入 = src["总营业收入"] ?? src["营业收入"] ?? f.营业收入;
    f.利润率 = f.营业收入 > 0 ? f.营业利润 / f.营业收入 : 0;
    return f;
  };

  const 实际 = toFin(actual);
  const 预算 = toFin(budget);
  const 差异 = empty();
  const 差异率 = empty();
  (Object.keys(实际) as (keyof FinancialLineActual)[]).forEach((k) => {
    if (k === "利润率") return;
    差异[k] = (实际[k] as number) - (预算[k] as number);
    const denom = 预算[k] as number;
    差异率[k] = denom !== 0 ? 差异[k] / denom : 0;
  });
  差异.利润率 = 实际.利润率 - 预算.利润率;
  差异率.利润率 = 预算.利润率 !== 0 ? 差异.利润率 / 预算.利润率 : 0;

  return { 实际, 预算, 差异, 差异率 };
}

export function buildBudgetNarratives(rows: BudgetVarianceRow[]): string[] {
  const rev = rows.find((r) => r.label === "总营业收入");
  const profit = rows.find((r) => r.label === "经营利润" || r.label === "营业利润");
  const labor = rows.find((r) => r.label === "人力成本");
  const energy = rows.find((r) => r.label === "能源费用");
  const material = rows.find((r) => r.label === "原材料成本");
  const otaFee = rows.find((r) => r.label === "OTA 佣金");
  const room = rows.find((r) => r.label === "客房收入");
  const catering = rows.find((r) => r.label === "餐饮收入");

  const lines: string[] = [];

  if (rev && rev.variance < 0) {
    lines.push("收入低于预算，主要需检查客房收入、餐饮收入与渠道间夜结构。");
  }
  const costOver = [labor, energy, material, otaFee].filter((r) => r && r.status === "超支");
  if (costOver.length) {
    lines.push("成本高于预算，优先检查人力成本、能源费用、原材料成本与 OTA 佣金。");
  }
  if (rev && profit && rev.variance >= 0 && profit.variance < 0) {
    lines.push("利润完成率低于收入完成率，说明成本费用端存在挤压。");
  }
  if (rev && profit && rev.status === "达标" && profit.status === "低于预算") {
    lines.push("收入完成率达标但利润未达标，应提示「收入质量不足或成本费用超支」。");
  }
  if (room && catering && room.variance < 0 && catering.variance < 0) {
    lines.push("客房与餐饮收入均未达预算，建议分渠道复盘价量结构。");
  }
  if (lines.length === 0) {
    lines.push("本期核心收入与利润科目整体接近预算，建议继续盯控成本费用与运营指标。");
  }
  return lines;
}

export function buildFullBudgetVariance(
  scope: typeof 全部门店值 | string,
  period: ReportPeriod,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap,
  actualDataSubjects?: Record<string, number>,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION,
  budgetDbSubjects?: Record<string, number>,
  hasDbBudget?: boolean,
  catalogOverride?: readonly BudgetSubjectDefinition[]
): FullBudgetVarianceReport {
  const catalog = catalogOverride ?? getFullBudgetSubjectCatalog();
  const budgetMap = mergeSubjectBudget(scope, period, overrides, budgetVersion, budgetDbSubjects);
  const actualMap = mergeSubjectActual(scope, period, overrides, actualOverrides, actualDataSubjects);

  const storageKey = buildBudgetStorageKey(scope, period, budgetVersion);
  const hasImportedBudget = Boolean(
    overrides?.[storageKey] && Object.keys(overrides[storageKey]!).length > 0
  );
  const hasBudgetData = Boolean(hasDbBudget) || hasImportedBudget;

  const rows: BudgetVarianceRow[] = catalog.map((s) => {
    const budget = budgetMap[s.label] ?? 0;
    const actual = actualMap[s.label] ?? 0;
    const variance = actual - budget;
    const { rate, label: varianceRateLabel } = computeVarianceRate(budget, actual);
    const { status, tone } = resolveVarianceStatus(s.direction, variance, budget, actual);
    return {
      label: s.label,
      group: s.group,
      unit: s.unit,
      direction: s.direction,
      actual,
      budget,
      variance,
      varianceRate: rate,
      varianceRateLabel,
      status,
      statusTone: tone
    };
  });

  return {
    rows,
    hasBudgetData,
    narratives: buildBudgetNarratives(rows),
    legacy: buildLegacyFromSubjects(budgetMap, actualMap)
  };
}

export function formatBudgetDisplayValue(value: number, unit: string, kind: BudgetSubjectDefinition["kind"]): string {
  if (!Number.isFinite(value)) return "—";
  if (kind === "wan" || unit === "万元" || unit.includes("万元")) {
    return `¥ ${value.toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} 万`;
  }
  if (kind === "percent" || unit === "%") {
    return `${value.toFixed(1)}%`;
  }
  if (kind === "yuan" || unit.includes("元")) {
    if (unit.includes("/") || unit.includes("间夜") || unit.includes("/人")) {
      return `¥ ${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}`;
    }
    return formatWan(value);
  }
  if (Number.isInteger(value)) return value.toLocaleString("zh-CN");
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export type BudgetTrendMetric = "收入" | "成本" | "利润" | "出租率" | "RevPAR" | "ADR";

const TREND_METRIC_SUBJECT: Record<BudgetTrendMetric, string> = {
  收入: "总营业收入",
  成本: "总营业成本",
  利润: "经营利润",
  出租率: "出租率",
  RevPAR: "RevPAR",
  ADR: "ADR 平均房价"
};

function financialLineOperatingCost(f: FinancialLineActual): number {
  return (
    f.人力成本 +
    f.能源费用 +
    f.华住管理费 +
    f.客房服务成本 +
    f.非客房服务成本 +
    f.原材料成本
  );
}

function hotelTrendMetricValue(
  metric: BudgetTrendMetric,
  kpi: { 入住率: number; revpar: number; 平均房价: number }
): number {
  if (metric === "出租率") return kpi.入住率 * 100;
  if (metric === "RevPAR") return kpi.revpar;
  return kpi.平均房价;
}

export function getBudgetTrendSeries(
  scope: typeof 全部门店值 | string,
  year: number,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap,
  metric: BudgetTrendMetric = "收入",
  actualDataSubjectsByMonth?: Record<number, Record<string, number>>,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
) {
  const end = reportPeriodToDbPeriod({ 粒度: "month", 年: year, 月: 6 });
  const storeRefs =
    scope === 全部门店值
      ? filterActiveMockStores().map((s) => ({ store_id: s.id, store_name: s.显示名称 }))
      : [{ store_id: scope, store_name: getStoreById(scope)?.显示名称 }];
  const periods =
    scope === 全部门店值
      ? trendPeriodsForAllStores(end, storeRefs, 6)
      : trendPeriodsForSingleStore(end, scope, getStoreById(scope)?.显示名称, 6);
  const subject = TREND_METRIC_SUBJECT[metric];
  return periods
    .map((dbp) => {
      const openIds = storeRefs
        .filter((s) => isStoreOpenInPeriod(s.store_id, s.store_name, dbp.period_value))
        .map((s) => s.store_id);
      if (!openIds.length) return null;

      const mm = Number(dbp.period_value.slice(-2));
      const p: ReportPeriod = { 粒度: "month", 年: year, 月: mm };
      const monthSubjects = actualDataSubjectsByMonth?.[mm];

      let actual: number;
      let budget: number;

      if (metric === "收入" || metric === "成本" || metric === "利润") {
        const aFin = getActualAggregatedByStoreIds(openIds, p, actualOverrides);
        const bFin = getBudgetAggregatedByStoreIds(openIds, p, overrides, budgetVersion);
        if (metric === "收入") {
          actual = aFin.营业收入;
          budget = bFin.营业收入;
        } else if (metric === "成本") {
          actual = financialLineOperatingCost(aFin);
          budget = financialLineOperatingCost(bFin);
        } else {
          actual = aFin.营业利润;
          budget = bFin.营业利润;
        }
      } else {
        const hotelIds = openIds.filter((id) => getStoreById(id)?.业态 === "酒店");
        if (!hotelIds.length) return null;
        if (hotelIds.length === 1 && openIds.length === 1) {
          const full = buildFullBudgetVariance(
            hotelIds[0]!,
            p,
            overrides,
            actualOverrides,
            monthSubjects,
            budgetVersion
          );
          const row = full.rows.find((r) => r.label === subject);
          actual = row?.actual ?? 0;
          budget = row?.budget ?? 0;
        } else {
          const actualKpi = getHotelOperationsKpisForStoreIds(hotelIds, p, actualOverrides);
          const budgetKpi = getBudgetHotelOperationsKpisForStoreIds(hotelIds, p, overrides, budgetVersion);
          if (!actualKpi || !budgetKpi) return null;
          actual = hotelTrendMetricValue(metric, actualKpi);
          budget = hotelTrendMetricValue(metric, budgetKpi);
        }
      }

      return {
        周期: dbp.period_value,
        month: dbp.period_value,
        实际收入: actual,
        预算收入: budget,
        实际成本: actual,
        预算成本: budget,
        实际利润: actual,
        预算利润: budget,
        actual,
        budget
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

export function isRowAbnormal(row: BudgetVarianceRow): boolean {
  if (row.budget === 0 && row.actual !== 0) return true;
  return row.statusTone === "bad";
}
