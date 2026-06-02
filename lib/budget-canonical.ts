/**
 * 预算 boss 口径 ↔ Supabase budget_data 列映射（与 actual_data 科目分离）
 *
 * 【预算科目统一口径 — 已冻结，见 docs/data-caliber-freeze.md】
 * - 总营业收入 → revenue_budget
 * - 总营业成本 → cost_budget
 * - 经营利润 → profit_budget
 * - 客房收入 → room_revenue_budget
 * - 可售房间数 → rooms_available_budget
 * - 已售房间数 → rooms_sold_budget
 *
 * 禁止重新引入「营业成本 / 运营成本 / 总成本」并列、
 * 「利润 / 运营利润 / 经营利润」并列等重复核心项（旧名仅作别名归并）。
 */

import type { BudgetSubjectValueMap } from "@/lib/budget-overrides";
import type { BudgetDataRow } from "@/src/lib/budget-data-service";

/** 老板 / 财务核心口径（预算管理页展示与落库） */
export const BUDGET_CORE_LABELS = {
  revenue: "总营业收入",
  cost: "总营业成本",
  profit: "经营利润",
  roomRevenue: "客房收入",
  roomsAvailable: "可售房间数",
  roomsSold: "已售房间数"
} as const;

/** 旧科目 / 经营模板别名 → 归入 canonical label 后读取 */
export const BUDGET_SUBJECT_READ_ALIASES: Record<string, readonly string[]> = {
  [BUDGET_CORE_LABELS.revenue]: ["总营业收入", "营业收入", "总营业收入(万元)"],
  [BUDGET_CORE_LABELS.cost]: [
    "总营业成本",
    "总成本",
    "营业成本",
    "运营成本",
    "营业成本（万元）"
  ],
  [BUDGET_CORE_LABELS.profit]: [
    "经营利润",
    "运营利润",
    "利润",
    "营业利润",
    "净利润",
    "营业利润（万元）"
  ],
  [BUDGET_CORE_LABELS.roomRevenue]: ["客房收入"],
  [BUDGET_CORE_LABELS.roomsAvailable]: ["可售房间数", "可售房晚", "可售间夜"],
  [BUDGET_CORE_LABELS.roomsSold]: ["已售房间数", "已售房晚", "已售间数"]
};

/** 预算管理页不展示（避免与核心口径重复） */
export const BUDGET_LEGACY_LABELS_HIDDEN_ON_MANAGEMENT_PAGE = new Set<string>([
  "营业收入",
  "总成本",
  "营业成本",
  "运营成本",
  "利润",
  "运营利润",
  "营业利润",
  "可售房晚",
  "已售房晚"
]);

export function pickBudgetSubjectValue(
  subjects: Record<string, number>,
  canonicalLabel: string
): number | undefined {
  const keys = BUDGET_SUBJECT_READ_ALIASES[canonicalLabel] ?? [canonicalLabel];
  for (const k of keys) {
    const v = subjects[k];
    if (v != null && Number.isFinite(v)) return v;
  }
  return undefined;
}

/** 保存前：把别名写入 canonical key，供表单与 upsert 使用 */
export function normalizeBudgetSubjectDraft(subjects: BudgetSubjectValueMap): BudgetSubjectValueMap {
  const out: BudgetSubjectValueMap = { ...subjects };

  for (const canonical of Object.values(BUDGET_CORE_LABELS)) {
    const v = pickBudgetSubjectValue(subjects, canonical);
    if (v != null && Number.isFinite(v)) {
      out[canonical] = v;
    }
  }

  return out;
}

export type BudgetDbCorePayload = {
  revenue_budget?: number | null;
  cost_budget?: number | null;
  profit_budget?: number | null;
  room_revenue_budget?: number | null;
  rooms_available_budget?: number | null;
  rooms_sold_budget?: number | null;
};

/** 草稿科目 → budget_data 核心列（唯一落库映射） */
export function budgetSubjectMapToUpsertPayload(
  subjects: BudgetSubjectValueMap
): BudgetDbCorePayload {
  const normalized = normalizeBudgetSubjectDraft(subjects);

  const revenue = pickBudgetSubjectValue(normalized, BUDGET_CORE_LABELS.revenue);
  const cost = pickBudgetSubjectValue(normalized, BUDGET_CORE_LABELS.cost);
  const profit = pickBudgetSubjectValue(normalized, BUDGET_CORE_LABELS.profit);
  const room = pickBudgetSubjectValue(normalized, BUDGET_CORE_LABELS.roomRevenue);
  const avail = pickBudgetSubjectValue(normalized, BUDGET_CORE_LABELS.roomsAvailable);
  const sold = pickBudgetSubjectValue(normalized, BUDGET_CORE_LABELS.roomsSold);

  const out: BudgetDbCorePayload = {};

  if (revenue != null && Number.isFinite(revenue)) out.revenue_budget = revenue;
  if (cost != null && Number.isFinite(cost)) out.cost_budget = cost;
  if (profit != null && Number.isFinite(profit)) out.profit_budget = profit;
  if (room != null && Number.isFinite(room)) out.room_revenue_budget = room;
  if (avail != null && Number.isFinite(avail)) out.rooms_available_budget = avail;
  if (sold != null && Number.isFinite(sold)) out.rooms_sold_budget = sold;

  if (
    out.revenue_budget != null &&
    out.cost_budget != null &&
    out.profit_budget == null
  ) {
    out.profit_budget = out.revenue_budget - out.cost_budget;
  }

  return out;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** budget_data 行 → 预算管理页 canonical 科目（读库展示） */
export function budgetDataRowsToCanonicalSubjectMap(rows: BudgetDataRow[]): Record<string, number> {
  const out: Record<string, number> = {};

  let revenue = 0;
  let cost = 0;
  let profit = 0;
  let roomRev = 0;
  let roomsAvail = 0;
  let roomsSold = 0;

  for (const row of rows) {
    revenue += num(row.revenue_budget);
    cost += num(row.cost_budget);
    profit += num(row.profit_budget);
    roomRev += num(row.room_revenue_budget);
    roomsAvail += num(row.rooms_available_budget);
    roomsSold += num(row.rooms_sold_budget);
  }

  if (revenue > 0) out[BUDGET_CORE_LABELS.revenue] = revenue;
  if (cost > 0) out[BUDGET_CORE_LABELS.cost] = cost;
  if (profit !== 0) out[BUDGET_CORE_LABELS.profit] = profit;
  if (roomRev > 0) out[BUDGET_CORE_LABELS.roomRevenue] = roomRev;
  if (roomsAvail > 0) out[BUDGET_CORE_LABELS.roomsAvailable] = roomsAvail;
  if (roomsSold > 0) out[BUDGET_CORE_LABELS.roomsSold] = roomsSold;

  return out;
}
