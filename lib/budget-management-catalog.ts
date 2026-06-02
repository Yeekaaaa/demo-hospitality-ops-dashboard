/**
 * 预算管理页专用科目表（老板口径，不含经营模板重复项）
 */

import {
  BUDGET_SUBJECT_CATALOG,
  type BudgetSubjectDefinition,
  type BudgetSubjectGroup
} from "@/lib/budget-subjects";
import { BUDGET_CORE_LABELS, BUDGET_LEGACY_LABELS_HIDDEN_ON_MANAGEMENT_PAGE } from "@/lib/budget-canonical";

const G = {
  收入: "收入预算" as BudgetSubjectGroup,
  酒店: "酒店运营预算" as BudgetSubjectGroup,
  成本: "成本预算" as BudgetSubjectGroup,
  利润: "利润预算" as BudgetSubjectGroup
};

function pick(label: string, patch?: Partial<BudgetSubjectDefinition>): BudgetSubjectDefinition {
  const base = BUDGET_SUBJECT_CATALOG.find((s) => s.label === label);
  if (base) {
    return {
      ...base,
      ...patch,
      legacyKeys: [...(base.legacyKeys ?? []), ...(patch?.legacyKeys ?? [])]
    };
  }
  return {
    label,
    group: G.成本,
    unit: "万元",
    kind: "wan",
    direction: "cost",
    description: patch?.description ?? label,
    ...patch
  };
}

function defCore(
  label: string,
  group: BudgetSubjectGroup,
  unit: string,
  kind: BudgetSubjectDefinition["kind"],
  direction: BudgetSubjectDefinition["direction"],
  description: string,
  legacyKeys?: string[]
): BudgetSubjectDefinition {
  return { label, group, unit, kind, direction, description, legacyKeys };
}

/** 预算管理页月度表科目顺序（固定分组） */
export function getBudgetManagementSubjectCatalog(): readonly BudgetSubjectDefinition[] {
  return [
    defCore(
      BUDGET_CORE_LABELS.revenue,
      G.收入,
      "万元",
      "wan",
      "revenue",
      "门店预算总收入目标（写入 budget_data.revenue_budget）。",
      ["营业收入", "总营业收入"]
    ),
    pick("客房收入", { group: G.收入, direction: "revenue" }),
    pick("餐饮收入", { group: G.收入, direction: "revenue" }),
    pick("商品/零售收入", { group: G.收入, direction: "revenue" }),
    pick("会议/场地收入", { group: G.收入, direction: "revenue" }),
    pick("其他收入", { group: G.收入, direction: "revenue" }),

    defCore(
      BUDGET_CORE_LABELS.cost,
      G.成本,
      "万元",
      "wan",
      "cost",
      "门店预算总营业成本（写入 budget_data.cost_budget）。",
      ["总成本", "营业成本", "运营成本"]
    ),
    pick("人力成本", {
      label: "人工成本",
      group: G.成本,
      legacyKeys: ["人力成本", "人工成本"]
    }),
    pick("租金/物业费", {
      label: "房租/物业成本",
      group: G.成本,
      legacyKeys: ["租金/物业费", "房租/物业成本"]
    }),
    pick("能源费用", {
      label: "能耗成本",
      group: G.成本,
      legacyKeys: ["能源费用", "能耗成本"]
    }),
    pick("原材料成本", {
      label: "物料成本",
      group: G.成本,
      legacyKeys: ["原材料成本", "物料成本"]
    }),
    pick("维修维护成本", { group: G.成本 }),
    pick("销售费用", {
      label: "营销成本",
      group: G.成本,
      legacyKeys: ["销售费用", "市场推广费", "营销成本"]
    }),
    defCore("其他成本", G.成本, "万元", "wan", "cost", "其他未单独列示的成本预算。"),

    pick("可售房间数", { group: G.酒店, direction: "operating_high" }),
    pick("已售房间数", { group: G.酒店, direction: "operating_high" }),
    pick("出租率", {
      label: "预算出租率",
      group: G.酒店,
      legacyKeys: ["出租率", "预算出租率"]
    }),
    pick("ADR 平均房价", {
      label: "预算 ADR",
      group: G.酒店,
      legacyKeys: ["ADR 平均房价", "预算 ADR"]
    }),
    pick("RevPAR", {
      label: "预算 RevPAR",
      group: G.酒店,
      legacyKeys: ["RevPAR", "预算 RevPAR"]
    }),

    defCore(
      BUDGET_CORE_LABELS.profit,
      G.利润,
      "万元",
      "wan",
      "profit",
      "经营利润预算目标（写入 budget_data.profit_budget）。",
      ["营业利润", "运营利润", "利润", "净利润"]
    )
  ];
}

export const BUDGET_MANAGEMENT_GROUP_ORDER: BudgetSubjectGroup[] = [
  "收入预算",
  "成本预算",
  "酒店运营预算",
  "利润预算"
];

export function isBudgetManagementCatalogLabel(label: string): boolean {
  return getBudgetManagementSubjectCatalog().some((s) => s.label === label);
}

export function filterDraftToManagementCatalog(
  draft: Record<string, number>
): Record<string, number> {
  const catalog = getBudgetManagementSubjectCatalog();
  const out: Record<string, number> = {};
  for (const s of catalog) {
    const v = draft[s.label];
    if (v != null && Number.isFinite(v)) out[s.label] = v;
    else if (s.legacyKeys) {
      for (const k of s.legacyKeys) {
        const lv = draft[k];
        if (lv != null && Number.isFinite(lv)) {
          out[s.label] = lv;
          break;
        }
      }
    }
  }
  return out;
}

/** 从完整科目表合并结果中剔除重复旧项 */
export function stripHiddenLegacyBudgetLabels<T extends { label: string }>(rows: T[]): T[] {
  return rows.filter((r) => !BUDGET_LEGACY_LABELS_HIDDEN_ON_MANAGEMENT_PAGE.has(r.label));
}
