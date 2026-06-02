/**
 * 经营与财务 mock 数据（按门店差异化 + 预算逻辑）
 * 金额单位：元（演示）
 */

import {
  全部门店值,
  getHotelStores,
  getRestaurantStores,
  getStoreById,
  type StoreMaster,
  门店主数据
} from "@/lib/store-master";
import { filterActiveMockStores } from "@/lib/active-store-scope";
import { dbPeriodToReportPeriod, reportPeriodToDbPeriod } from "@/lib/dashboard-metrics";
import { isStoreOpenInPeriod, trendPeriodsForAllStores, trendPeriodsForSingleStore } from "@/lib/trend-periods";
import { DEFAULT_BUDGET_VERSION, type BudgetVersionValue } from "@/lib/budget-versions";
import { buildFullBudgetVariance } from "@/lib/budget-variance";
import {
  BUDGET_SUBJECT_CATALOG,
  resolveBudgetSubjectLabel
} from "@/lib/budget-subjects";
import {
  buildBudgetStorageKey,
  type BudgetEditableValues,
  type BudgetOverrideMap
} from "@/lib/budget-overrides";
import {
  buildActualStorageKey,
  type ActualHotelKey,
  type ActualOverrideMap
} from "@/lib/actual-overrides";

export type PeriodGranularity = "month" | "quarter" | "year";

export interface ReportPeriod {
  粒度: PeriodGranularity;
  /** 演示固定：2026 */
  年: number;
  /** 月份 1-12，粒度为 month 时有效 */
  月?: number;
  /** 季度 1-4，粒度为 quarter 时有效 */
  季?: number;
}

/** 演示用固定账期 */
export const 演示账期: ReportPeriod = {
  粒度: "month",
  年: 2026,
  月: 4
};

function periodScale(p: ReportPeriod): number {
  if (p.粒度 === "month") return 1;
  if (p.粒度 === "quarter") return 3;
  return 12;
}

function hashSeed(parts: string[]): number {
  const s = parts.join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 同一输入下预算相对稳定的扰动 */
function budgetFactor(storeId: string, key: string): number {
  const h = hashSeed([storeId, key, "budget-v1"]);
  return 0.94 + (h % 140) / 1000;
}

/** 月度营业收入基准（元）— 体现规模与业务逻辑差异 */
const 月度营业收入基准: Record<string, number> = {
  "hotel-mujia-quanji-huaianxi": 1780000,
  "hotel-yuhang-quanji-zhongshanxi": 1710000,
  "hotel-zetong-xingcheng-zhongshanxi": 1320000,
  "rest-xibeifu-sjz": 530000
};

export interface FinancialLineActual {
  营业收入: number;
  客房收入: number;
  餐饮收入: number;
  其他收入: number;
  人力成本: number;
  能源费用: number;
  华住管理费: number;
  客房服务成本: number;
  非客房服务成本: number;
  原材料成本: number;
  毛利: number;
  营业利润: number;
  利润率: number;
}

function computeStoreMonthActual(store: StoreMaster): FinancialLineActual {
  const R = 月度营业收入基准[store.id] ?? 800000;

  let 客房收入 = 0;
  let 餐饮收入 = 0;
  let 其他收入 = 0;

  if (store.业态 === "酒店") {
    const isQuanjiHigh = store.id.includes("quanji");
    const isXingcheng = store.id.includes("xingcheng");
    const isSuide = store.id.includes("suide");

    const occBoost = isXingcheng ? 1.06 : isQuanjiHigh ? 1 : 0.94;
    const adrBoost = isQuanjiHigh ? 1.08 : isXingcheng ? 0.88 : isSuide ? 0.82 : 1;

    const roomShare = (0.68 * occBoost * adrBoost) / (0.68 * occBoost * adrBoost + 0.12 + 0.08);
    客房收入 = R * Math.min(0.78, Math.max(0.55, roomShare));
    餐饮收入 = R * (store.id.includes("mujia") || store.id.includes("yuhang") ? 0.14 : 0.11);
    其他收入 = R - 客房收入 - 餐饮收入;

    const mgmtRate = 0.072;
    const laborRate = isSuide ? 0.24 : isXingcheng ? 0.19 : 0.175;
    const energyRate = isSuide ? 0.065 : 0.045;
    const roomSvcRate = isSuide ? 0.095 : 0.072;
    const nonRoomSvcRate = 0.068;
    const materialRate = 0.035;

    const 人力成本 = R * laborRate;
    const 能源费用 = R * energyRate;
    const 华住管理费 = R * mgmtRate;
    const 客房服务成本 = R * roomSvcRate;
    const 非客房服务成本 = R * nonRoomSvcRate;
    const 原材料成本 = R * materialRate;

    const 直接成本合计 = 客房服务成本 + 原材料成本 + 非客房服务成本 * 0.55;
    const 毛利 = R - 直接成本合计;
    const 营业利润 = R - (人力成本 + 能源费用 + 华住管理费 + 客房服务成本 + 非客房服务成本 + 原材料成本);
    const 利润率 = R > 0 ? 营业利润 / R : 0;

    return roundFin({
      营业收入: R,
      客房收入,
      餐饮收入,
      其他收入,
      人力成本,
      能源费用,
      华住管理费,
      客房服务成本,
      非客房服务成本,
      原材料成本,
      毛利,
      营业利润,
      利润率
    });
  }

  /** 餐饮 */
  const isXibeifu = store.id.includes("xibeifu");
  const stability = isXibeifu ? 1.08 : 0.96;

  餐饮收入 = R * 0.92;
  其他收入 = R * 0.08;
  const laborRate = isXibeifu ? 0.31 : 0.26;
  const energyRate = 0.032;
  const mgmtRate = isXibeifu ? 0.02 : 0.015;
  const materialRate = isXibeifu ? 0.36 : 0.33;

  const 人力成本 = R * laborRate * stability;
  const 能源费用 = R * energyRate;
  const 华住管理费 = R * mgmtRate;
  const 客房服务成本 = 0;
  const 非客房服务成本 = R * 0.045;
  const 原材料成本 = R * materialRate * (isXibeifu ? 1.05 : 0.98);

  const directCost = 原材料成本 + 人力成本 * 0.55 + 能源费用 * 0.8;
  const 毛利 = R - directCost;
  const 营业利润 = R - (人力成本 + 能源费用 + 华住管理费 + 非客房服务成本 + 原材料成本);
  const 利润率 = R > 0 ? 营业利润 / R : 0;

  return roundFin({
    营业收入: R,
    客房收入: 0,
    餐饮收入,
    其他收入,
    人力成本,
    能源费用,
    华住管理费,
    客房服务成本,
    非客房服务成本,
    原材料成本,
    毛利,
    营业利润,
    利润率
  });
}

function roundFin(o: FinancialLineActual): FinancialLineActual {
  const out = { ...o };
  (Object.keys(out) as (keyof FinancialLineActual)[]).forEach((k) => {
    if (k === "利润率") out[k] = Math.round(out[k] * 1000) / 1000;
    else out[k] = Math.round(out[k] * 10) / 10;
  });
  return out;
}

function emptyLine(): FinancialLineActual {
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

function applyBudgetOverride(base: FinancialLineActual, override?: BudgetEditableValues): FinancialLineActual {
  if (!override) return base;
  const next: FinancialLineActual = { ...base };
  for (const [rawKey, value] of Object.entries(override)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const label = resolveBudgetSubjectLabel(rawKey) ?? rawKey;
    const def = BUDGET_SUBJECT_CATALOG.find((s) => s.label === label);
    if (!def?.financialKey) continue;
    let v = value;
    if (def.financialKey === "利润率") v = v / 100;
    next[def.financialKey] = v;
    if (label === "总营业收入") next.营业收入 = v;
  }
  next.利润率 = next.营业收入 > 0 ? next.营业利润 / next.营业收入 : 0;
  return roundFin(next);
}

function applyActualFinancialOverride(
  base: FinancialLineActual,
  override?: ActualOverrideMap[string]
): FinancialLineActual {
  if (!override) return base;
  const next = { ...base };
  const keys: Array<Exclude<keyof FinancialLineActual, "毛利" | "利润率">> = [
    "营业收入",
    "客房收入",
    "餐饮收入",
    "其他收入",
    "人力成本",
    "能源费用",
    "华住管理费",
    "客房服务成本",
    "非客房服务成本",
    "原材料成本",
    "营业利润"
  ];
  keys.forEach((k) => {
    const v = override[k];
    if (typeof v === "number" && Number.isFinite(v)) next[k] = v;
  });
  next.毛利 =
    next.营业收入 -
    (next.原材料成本 + next.人力成本 * 0.55 + next.能源费用 * 0.8);
  next.利润率 = next.营业收入 > 0 ? next.营业利润 / next.营业收入 : 0;
  return roundFin(next);
}

function sumFinancials(rows: FinancialLineActual[]): FinancialLineActual {
  if (rows.length === 0) return emptyLine();
  const keys = Object.keys(rows[0]) as (keyof FinancialLineActual)[];
  const acc = emptyLine();
  keys.forEach((k) => {
    if (k === "利润率") return;
    acc[k] = rows.reduce((s, r) => s + r[k], 0);
  });
  acc.利润率 = acc.营业收入 > 0 ? acc.营业利润 / acc.营业收入 : 0;
  return roundFin(acc);
}

export function getActualForStore(
  storeId: string,
  period: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): FinancialLineActual {
  const scale = periodScale(period);
  const store = getStoreById(storeId);
  if (!store) {
    return roundFin({
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
  }
  const m = computeStoreMonthActual(store);
  const scaleRow = (r: FinancialLineActual): FinancialLineActual => {
    const out = { ...r };
    (Object.keys(out) as (keyof FinancialLineActual)[]).forEach((k) => {
      if (k === "利润率") return;
      (out[k] as number) *= scale;
    });
    out.利润率 = out.营业收入 > 0 ? out.营业利润 / out.营业收入 : 0;
    return roundFin(out);
  };
  const scaled = scaleRow(m);
  const key = buildActualStorageKey(storeId, period);
  return applyActualFinancialOverride(scaled, actualOverrides?.[key]);
}

export function getActualAggregated(
  scope: typeof 全部门店值 | string,
  period: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): FinancialLineActual {
  if (scope === 全部门店值) {
    return sumFinancials(
      filterActiveMockStores().map((s) => getActualForStore(s.id, period, actualOverrides))
    );
  }
  return getActualForStore(scope, period, actualOverrides);
}

export function getActualAggregatedHotelsOnly(
  period: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): FinancialLineActual {
  return sumFinancials(getHotelStores().map((s) => getActualForStore(s.id, period, actualOverrides)));
}

export function getActualAggregatedRestaurantsOnly(
  period: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): FinancialLineActual {
  return sumFinancials(getRestaurantStores().map((s) => getActualForStore(s.id, period, actualOverrides)));
}

export function getActualAggregatedByStoreIds(
  ids: string[],
  period: ReportPeriod,
  actualOverrides?: ActualOverrideMap
): FinancialLineActual {
  return sumFinancials(ids.map((id) => getActualForStore(id, period, actualOverrides)));
}

export function getBudgetAggregatedByStoreIds(
  ids: string[],
  period: ReportPeriod,
  budgetOverrides?: BudgetOverrideMap,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
): FinancialLineActual {
  return sumFinancials(ids.map((id) => getBudgetForScope(id, period, budgetOverrides, budgetVersion)));
}

export interface VarianceReport {
  实际: FinancialLineActual;
  预算: FinancialLineActual;
  差异: FinancialLineActual;
  差异率: FinancialLineActual;
}

export function buildBudgetFromActual(actual: FinancialLineActual, storeId: string): FinancialLineActual {
  const keys = Object.keys(actual) as (keyof FinancialLineActual)[];
  const b = emptyLine();
  keys.forEach((k) => {
    if (k === "利润率") return;
    const f = budgetFactor(storeId, String(k));
    const bias =
      k === "人力成本" || k === "原材料成本"
        ? f * 1.02
        : k === "营业利润"
          ? f * 0.97
          : f;
    b[k] = (actual[k] as number) * bias;
  });
  b.利润率 = b.营业收入 > 0 ? b.营业利润 / b.营业收入 : 0;
  return roundFin(b);
}

export function getBudgetForScope(
  scope: typeof 全部门店值 | string,
  period: ReportPeriod,
  overrides?: BudgetOverrideMap,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
): FinancialLineActual {
  if (scope === 全部门店值) {
    const budgets = filterActiveMockStores().map((s) => {
      const base = buildBudgetFromActual(getActualForStore(s.id, period), s.id);
      const key = buildBudgetStorageKey(s.id, period, budgetVersion);
      return applyBudgetOverride(base, overrides?.[key]);
    });
    const merged = sumFinancials(budgets);
    const allKey = buildBudgetStorageKey(全部门店值, period, budgetVersion);
    return applyBudgetOverride(merged, overrides?.[allKey]);
  }
  const actual = getActualForStore(scope, period);
  const base = buildBudgetFromActual(actual, scope);
  const key = buildBudgetStorageKey(scope, period, budgetVersion);
  return applyBudgetOverride(base, overrides?.[key]);
}

export function getVarianceAnalysis(
  scope: typeof 全部门店值 | string,
  period: ReportPeriod,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
): VarianceReport {
  const full = buildFullBudgetVariance(scope, period, overrides, actualOverrides, undefined, budgetVersion);
  return {
    实际: full.legacy.实际,
    预算: full.legacy.预算,
    差异: full.legacy.差异,
    差异率: full.legacy.差异率
  };
}

/** 利润表行（展示用） */
export const 利润表科目顺序: { key: keyof FinancialLineActual; label: string }[] = [
  { key: "营业收入", label: "营业收入" },
  { key: "客房收入", label: "客房收入" },
  { key: "餐饮收入", label: "餐饮收入" },
  { key: "其他收入", label: "其他收入" },
  { key: "人力成本", label: "人力成本" },
  { key: "能源费用", label: "能源费用" },
  { key: "华住管理费", label: "华住管理费" },
  { key: "客房服务成本", label: "客房服务成本" },
  { key: "非客房服务成本", label: "非客房服务成本" },
  { key: "原材料成本", label: "原材料成本（餐饮适用）" },
  { key: "毛利", label: "毛利" },
  { key: "营业利润", label: "营业利润" },
  { key: "利润率", label: "利润率" }
];

/** 入参为底层「元」；展示为「¥ … 万」（内部 ÷ 10,000） */
export function formatWan(yuan: number): string {
  if (Number.isNaN(yuan) || !Number.isFinite(yuan)) return "—";
  const wan = yuan / 10000;
  return `¥ ${wan.toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} 万`;
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

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

/** 趋势：从门店开业账期起算，不补 0，不强行凑满 6 期 */
export function getTrendSeries(
  scope: typeof 全部门店值 | string,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap
) {
  const currentDb = reportPeriodToDbPeriod(演示账期);
  const storeRefs =
    scope === 全部门店值
      ? filterActiveMockStores().map((s) => ({ store_id: s.id, store_name: s.显示名称 }))
      : [{ store_id: scope, store_name: getStoreById(scope)?.显示名称 }];
  const periods =
    scope === 全部门店值
      ? trendPeriodsForAllStores(currentDb, storeRefs, 6)
      : trendPeriodsForSingleStore(
          currentDb,
          scope,
          getStoreById(scope)?.显示名称,
          6
        );
  return periods
    .map((dbp) => {
      const openIds = storeRefs
        .filter((s) => isStoreOpenInPeriod(s.store_id, s.store_name, dbp.period_value))
        .map((s) => s.store_id);
      if (!openIds.length) return null;

      const p = dbPeriodToReportPeriod(dbp);
      const a = getActualAggregatedByStoreIds(openIds, p, actualOverrides);
      const b = getBudgetAggregatedByStoreIds(openIds, p, overrides);
      return {
        周期: dbp.period_value,
        实际收入: a.营业收入,
        预算收入: b.营业收入,
        实际成本: financialLineOperatingCost(a),
        预算成本: financialLineOperatingCost(b),
        实际利润: a.营业利润,
        预算利润: b.营业利润
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

/** Dashboard 指标 */
export function getDashboardKpis(
  storeScope: typeof 全部门店值 | string,
  period: ReportPeriod = 演示账期,
  actualOverrides?: ActualOverrideMap
) {
  const hotels = getHotelStores();

  const occByHotel: Record<string, number> = {
    "hotel-mujia-quanji-huaianxi": 0.86,
    "hotel-yuhang-quanji-zhongshanxi": 0.84,
    "hotel-zetong-xingcheng-zhongshanxi": 0.91
  };
  const adrByHotel: Record<string, number> = {
    "hotel-mujia-quanji-huaianxi": 392,
    "hotel-yuhang-quanji-zhongshanxi": 385,
    "hotel-zetong-xingcheng-zhongshanxi": 298
  };

  const hotelIdsForKpi =
    storeScope === 全部门店值
      ? hotels.map((h) => h.id)
      : hotels.some((h) => h.id === storeScope)
        ? [storeScope]
        : [];

  const isRestaurantOnly = storeScope !== 全部门店值 && storeScope.startsWith("rest-");

  const revenueScope =
    storeScope === 全部门店值
      ? getActualAggregated(全部门店值, period, actualOverrides).营业收入
      : getActualForStore(storeScope, period, actualOverrides).营业收入;

  let avgOcc = 0;
  let avgAdr = 0;
  if (hotelIdsForKpi.length > 0) {
    avgOcc = hotelIdsForKpi.reduce((s, id) => s + (occByHotel[id] ?? 0.82), 0) / hotelIdsForKpi.length;
    avgAdr = hotelIdsForKpi.reduce((s, id) => s + (adrByHotel[id] ?? 320), 0) / hotelIdsForKpi.length;
  }

  const revpar = avgAdr * avgOcc;

  const dayInPeriod =
    period.粒度 === "month" ? 26 : period.粒度 === "quarter" ? 90 : 365;
  const inventoryAlerts =
    storeScope === 全部门店值 ? 9 : isRestaurantOnly ? 5 : 6;
  const pending = storeScope === 全部门店值 ? 7 : 4;
  const onDuty = Math.round(210 + (storeScope === 全部门店值 ? 86 : 22));

  return {
    今日营收: revenueScope / dayInPeriod,
    入住率: isRestaurantOnly ? null : avgOcc,
    adr: isRestaurantOnly ? null : avgAdr,
    revpar: isRestaurantOnly ? null : revpar,
    餐饮日营收: isRestaurantOnly
      ? revenueScope / dayInPeriod
      : getActualAggregatedRestaurantsOnly(period, actualOverrides).营业收入 / dayInPeriod,
    库存预警条数: inventoryAlerts,
    待审批项: pending,
    今日在岗: onDuty
  };
}

export function getHotelOperationsKpisForStoreIds(
  storeIds: string[],
  period: ReportPeriod = 演示账期,
  actualOverrides?: ActualOverrideMap
) {
  const targetIds = storeIds.filter((id) => getStoreById(id)?.业态 === "酒店");
  if (!targetIds.length) return null;

  const list = targetIds.map((id) => {
    const a = getActualForRoomNightBase(id, period, actualOverrides);
    return { ...a };
  });

  const sum = list.reduce(
    (acc, row) => ({
      可售间夜: acc.可售间夜 + row.可售间夜,
      已售间夜: acc.已售间夜 + row.已售间夜,
      客房收入: acc.客房收入 + row.客房收入
    }),
    { 可售间夜: 0, 已售间夜: 0, 客房收入: 0 }
  );

  const scale = periodScale(period);
  const 入住率 = sum.可售间夜 > 0 ? sum.已售间夜 / sum.可售间夜 : 0;
  const 平均房价 = sum.已售间夜 > 0 ? sum.客房收入 / sum.已售间夜 : 0;
  const revpar = sum.可售间夜 > 0 ? sum.客房收入 / sum.可售间夜 : 0;

  const fa =
    targetIds.length === 1
      ? getActualForStore(targetIds[0]!, period, actualOverrides)
      : getActualAggregatedByStoreIds(targetIds, period, actualOverrides);

  return {
    可售间夜: Math.round(sum.可售间夜 * scale),
    已售间数: Math.round(sum.已售间夜 * scale),
    入住率,
    平均房价: Math.round(平均房价 * 10) / 10,
    revpar: Math.round(revpar * 10) / 10,
    客房收入: fa.客房收入,
    华住管理费: fa.华住管理费,
    人力成本: fa.人力成本,
    能源费用: fa.能源费用
  };
}

export function getHotelOperationsKpis(
  storeScope: "all" | string,
  period: ReportPeriod = 演示账期,
  actualOverrides?: ActualOverrideMap
) {
  const hotels = getHotelStores();
  const targetIds =
    storeScope === "all" ? hotels.map((h) => h.id) : hotels.some((h) => h.id === storeScope) ? [storeScope] : hotels.map((h) => h.id);
  return getHotelOperationsKpisForStoreIds(targetIds, period, actualOverrides)!;
}

export function getBudgetHotelOperationsKpisForStoreIds(
  storeIds: string[],
  period: ReportPeriod = 演示账期,
  overrides?: BudgetOverrideMap,
  budgetVersion: BudgetVersionValue = DEFAULT_BUDGET_VERSION
) {
  const targetIds = storeIds.filter((id) => getStoreById(id)?.业态 === "酒店");
  if (!targetIds.length) return null;

  const list = targetIds.map((id) => {
    const room = getActualForRoomNightBase(id, period);
    const b = getBudgetForScope(id, period, overrides, budgetVersion);
    return { 可售间夜: room.可售间夜, 已售间夜: room.已售间夜, 客房收入: b.客房收入 };
  });

  const sum = list.reduce(
    (acc, row) => ({
      可售间夜: acc.可售间夜 + row.可售间夜,
      已售间夜: acc.已售间夜 + row.已售间夜,
      客房收入: acc.客房收入 + row.客房收入
    }),
    { 可售间夜: 0, 已售间夜: 0, 客房收入: 0 }
  );

  const 入住率 = sum.可售间夜 > 0 ? sum.已售间夜 / sum.可售间夜 : 0;
  const 平均房价 = sum.已售间夜 > 0 ? sum.客房收入 / sum.已售间夜 : 0;
  const revpar = sum.可售间夜 > 0 ? sum.客房收入 / sum.可售间夜 : 0;

  return {
    入住率,
    平均房价: Math.round(平均房价 * 10) / 10,
    revpar: Math.round(revpar * 10) / 10
  };
}

function getActualForRoomNightBase(
  storeId: string,
  period: ReportPeriod,
  actualOverrides?: ActualOverrideMap
) {
  const occ: Record<string, number> = {
    "hotel-mujia-quanji-huaianxi": 0.86,
    "hotel-yuhang-quanji-zhongshanxi": 0.84,
    "hotel-zetong-xingcheng-zhongshanxi": 0.91
  };
  const nights: Record<string, number> = {
    "hotel-mujia-quanji-huaianxi": 4200,
    "hotel-yuhang-quanji-zhongshanxi": 4100,
    "hotel-zetong-xingcheng-zhongshanxi": 3800
  };
  const o = occ[storeId] ?? 0.82;
  const n = nights[storeId] ?? 3500;
  const sold = Math.round(n * o);
  const a = getActualForStore(storeId, period, actualOverrides);
  const key = buildActualStorageKey(storeId, period);
  const override = actualOverrides?.[key];
  const 可售间夜 = typeof override?.["可售间夜数"] === "number" ? override["可售间夜数"] : n;
  const 已售间夜 = typeof override?.["已售间数"] === "number" ? override["已售间数"] : sold;
  return { 可售间夜, 已售间夜, 客房收入: a.客房收入 };
}

export function getRestaurantOperationsKpis(
  storeScope: "all" | string,
  period: ReportPeriod = 演示账期,
  actualOverrides?: ActualOverrideMap
) {
  const rests = getRestaurantStores();
  const ids =
    storeScope === "all"
      ? rests.map((r) => r.id)
      : rests.some((r) => r.id === storeScope)
        ? [storeScope]
        : rests.map((r) => r.id);

  const rows = ids.map((id) => {
    const a = getActualForStore(id, period, actualOverrides);
    const isXibeifu = id.includes("xibeifu");
    return {
      营业收入: a.营业收入,
      客单价: isXibeifu ? 68 : 42,
      毛利率: a.毛利 / (a.营业收入 || 1),
      原材料成本: a.原材料成本,
      损耗率: isXibeifu ? 0.028 : 0.019
    };
  });

  const sumR = rows.reduce((s, r) => s + r.营业收入, 0);
  const avgTicket =
    rows.reduce((s, r) => s + r.客单价, 0) / rows.length;
  const avgGross =
    rows.reduce((s, r) => s + r.毛利率, 0) / rows.length;
  const material = rows.reduce((s, r) => s + r.原材料成本, 0);
  const loss = rows.reduce((s, r) => s + r.损耗率, 0) / rows.length;

  return {
    营业收入: sumR,
    客单价: Math.round(avgTicket * 10) / 10,
    毛利率: Math.round(avgGross * 1000) / 1000,
    原材料成本: material,
    损耗率: Math.round(loss * 1000) / 1000
  };
}

/** 预算管理：顶部 KPI */
export function getBudgetManagementSummary(
  period: ReportPeriod,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap
) {
  const fullAll = buildFullBudgetVariance(全部门店值, period, overrides, actualOverrides);
  const revRow = fullAll.rows.find((r) => r.label === "总营业收入");
  const profRow = fullAll.rows.find((r) => r.label === "营业利润");
  const 收入完成率 = revRow && revRow.budget > 0 ? revRow.actual / revRow.budget : 0;
  const 利润完成率 = profRow && profRow.budget !== 0 ? profRow.actual / profRow.budget : 0;

  let 超支门店数 = 0;
  let maxDev = 0;
  let maxStore = "";
  filterActiveMockStores().forEach((s) => {
    const full = buildFullBudgetVariance(s.id, period, overrides, actualOverrides);
    const costRows = full.rows.filter((r) => r.direction === "cost" && r.group !== "费用预算");
    const feeRows = full.rows.filter((r) => r.group === "费用预算");
    const costActual = [...costRows, ...feeRows].reduce((sum, r) => sum + r.actual, 0);
    const costBudget = [...costRows, ...feeRows].reduce((sum, r) => sum + r.budget, 0);
    if (costBudget > 0 && costActual > costBudget * 1.02) 超支门店数 += 1;
    const p = full.rows.find((r) => r.label === "营业利润");
    const dev = p && p.budget !== 0 ? Math.abs(p.variance / p.budget) : 0;
    if (dev > maxDev) {
      maxDev = dev;
      maxStore = s.显示名称;
    }
  });

  return {
    收入完成率,
    利润完成率,
    成本超支门店数: 超支门店数,
    偏差最大门店: maxStore || "—"
  };
}

export function getStoreBudgetDeviationRank(
  period: ReportPeriod,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap
) {
  return filterActiveMockStores()
    .map((s) => {
      const v = getVarianceAnalysis(s.id, period, overrides, actualOverrides);
      return {
        门店: s.显示名称,
        id: s.id,
        实际利润: v.实际.营业利润,
        预算利润: v.预算.营业利润,
        差异率: v.预算.营业利润 !== 0 ? v.差异.营业利润 / v.预算.营业利润 : 0
      };
    })
    .sort((a, b) => Math.abs(b.差异率) - Math.abs(a.差异率));
}

export function getQuarterlyBudgetSummary(
  year: number,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap
) {
  const q = [1, 2, 3, 4].map((季) => {
    const period: ReportPeriod = { 粒度: "quarter", 年: year, 季 };
    const a = getActualAggregated(全部门店值, period, actualOverrides);
    const b = getBudgetForScope(全部门店值, period, overrides);
    return {
      季度: `Q${季}`,
      实际收入: a.营业收入,
      预算收入: b.营业收入,
      实际利润: a.营业利润,
      预算利润: b.营业利润,
      收入完成率: b.营业收入 > 0 ? a.营业收入 / b.营业收入 : 0
    };
  });
  return q;
}

export function getAnnualCompletion(
  year: number,
  overrides?: BudgetOverrideMap,
  actualOverrides?: ActualOverrideMap
) {
  const period: ReportPeriod = { 粒度: "year", 年: year };
  const a = getActualAggregated(全部门店值, period, actualOverrides);
  const b = getBudgetForScope(全部门店值, period, overrides);
  return {
    年: year,
    实际收入: a.营业收入,
    预算收入: b.营业收入,
    实际利润: a.营业利润,
    预算利润: b.营业利润,
    收入完成率: b.营业收入 > 0 ? a.营业收入 / b.营业收入 : 0,
    利润完成率: b.营业利润 !== 0 ? a.营业利润 / b.营业利润 : 0
  };
}

export { getHotelStores, getRestaurantStores, 门店主数据, 全部门店值 };
export type { StoreMaster };
