/**
 * 从经营数据 master schema 派生的预算科目（与 Excel 表头名称对齐）
 */

import { BUDGET_CORE_LABELS } from "@/lib/budget-canonical";
import type { BudgetSubjectDefinition, BudgetSubjectDirection, BudgetSubjectGroup } from "@/lib/budget-subjects";
import { BUDGET_SUBJECT_CATALOG } from "@/lib/budget-subjects";
import { OPERATING_DATA_EXTENSION_IMPORT_COLUMNS } from "@/lib/operating-data-asset-field-meta";
import {
  OPERATING_BUDGET_ALIGNED_HEADERS,
  OPERATING_DATA_BASE_BUSINESS_HEADERS
} from "@/lib/operating-data-master-schema";

const EXISTING_LABELS = new Set(BUDGET_SUBJECT_CATALOG.map((s) => s.label));

/** 经营表头 → 已有预算科目（不重复新增） */
const HEADER_TO_EXISTING_BUDGET_LABEL: Partial<Record<string, string>> = {
  营业收入: "总营业收入",
  客房收入: "客房收入",
  总成本: BUDGET_CORE_LABELS.cost,
  营业成本: BUDGET_CORE_LABELS.cost,
  运营成本: BUDGET_CORE_LABELS.cost,
  运营利润: BUDGET_CORE_LABELS.profit,
  利润: BUDGET_CORE_LABELS.profit,
  可售房晚: "可售房间数",
  已售房晚: "已售房间数",
  品牌管理费: "品牌管理费",
  华住管理费: "品牌管理费",
  客房服务成本: "客房服务成本",
  非客房服务成本: "非客房服务成本",
  销售费用: "销售费用",
  管理费用: "管理费用",
  净利润: "净利润",
  差评数: "差评控制目标",
  投诉数: "投诉数量控制"
};

function directionForHeader(header: string): BudgetSubjectDirection {
  if (
    [
      "营业收入",
      "客房收入",
      "其他业务收入",
      "营业外收入",
      "利润",
      "运营利润",
      "净利润",
      "摊销后纯利润"
    ].includes(header)
  ) {
    return header === "利润" || header === "运营利润" || header === "净利润" || header === "摊销后纯利润"
      ? "profit"
      : "revenue";
  }
  if (
    [
      "可售房晚",
      "已售房晚",
      "时租房间数",
      "过夜房间数",
      "OTA间夜占比",
      "会员间夜占比",
      "协议客户占比",
      "散客占比",
      "直销占比"
    ].includes(header)
  ) {
    return "operating_high";
  }
  if (["差评数", "投诉数", "异常维修数", "员工流失率", "同商圈新增竞品数"].includes(header)) {
    return "risk";
  }
  return "cost";
}

function groupForHeader(header: string): BudgetSubjectGroup {
  if (["营业收入", "客房收入", "其他业务收入", "营业外收入"].includes(header)) return "收入预算";
  if (["可售房晚", "已售房晚", "时租房间数", "过夜房间数"].includes(header)) return "酒店运营预算";
  if (
    ["OTA间夜占比", "会员间夜占比", "协议客户占比", "散客占比", "直销占比"].includes(header)
  ) {
    return "酒店运营预算";
  }
  if (["利润", "运营利润", "净利润", "摊销后纯利润"].includes(header)) return "利润预算";
  if (["差评数", "投诉数", "异常维修数", "员工流失率", "同商圈新增竞品数"].includes(header)) {
    return "经营动作与风险预算";
  }
  if (["销售费用", "管理费用", "房租", "税金及附加"].includes(header)) return "费用预算";
  return "成本预算";
}

function unitForHeader(header: string): { unit: string; kind: BudgetSubjectDefinition["kind"] } {
  const ext = OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.find((c) => c.headerZh === header);
  if (ext?.kind === "ratio_or_percent") return { unit: "%", kind: "percent" };
  if (ext?.kind === "count") return { unit: "次", kind: "count" };
  if (ext?.kind === "integer" || header === "可售房晚" || header === "已售房晚") {
    return { unit: "间夜", kind: "count" };
  }
  return { unit: "元", kind: "yuan" };
}

/** 仅包含经营模板有、且标准 73 科目中尚未覆盖的科目 */
export function buildOperatingOnlyBudgetSubjects(): BudgetSubjectDefinition[] {
  const out: BudgetSubjectDefinition[] = [];

  for (const header of OPERATING_BUDGET_ALIGNED_HEADERS) {
    const mapped = HEADER_TO_EXISTING_BUDGET_LABEL[header];
    if (mapped && EXISTING_LABELS.has(mapped)) continue;
    if (EXISTING_LABELS.has(header)) continue;

    const { unit, kind } = unitForHeader(header);
    out.push({
      label: header,
      group: groupForHeader(header),
      unit,
      kind,
      direction: directionForHeader(header),
      description: `经营实际数据模板科目「${header}」，预算值与 actual_data 同名字段对比。`,
      legacyKeys: mapped ? [mapped] : undefined
    });
  }

  return out;
}

/** 预算 vs 实际完整科目表：标准科目 + 经营派生科目（按 label 去重，标准科目优先） */
export function getFullBudgetSubjectCatalog(): readonly BudgetSubjectDefinition[] {
  const operatingOnly = buildOperatingOnlyBudgetSubjects();
  const labels = new Set(BUDGET_SUBJECT_CATALOG.map((s) => s.label));
  const extra = operatingOnly.filter((s) => !labels.has(s.label));
  return [...BUDGET_SUBJECT_CATALOG, ...extra];
}

/** 将经营聚合科目映射到预算科目 label（含别名） */
export function mapOperatingSubjectsToBudgetLabels(
  operatingSubjects: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = { ...operatingSubjects };

  for (const header of OPERATING_DATA_BASE_BUSINESS_HEADERS) {
    const v = operatingSubjects[header];
    if (v == null) continue;
    const mapped = HEADER_TO_EXISTING_BUDGET_LABEL[header];
    if (mapped) out[mapped] = v;
  }

  for (const ext of OPERATING_DATA_EXTENSION_IMPORT_COLUMNS) {
    const v = operatingSubjects[ext.headerZh];
    if (v == null) continue;
    const mapped = HEADER_TO_EXISTING_BUDGET_LABEL[ext.headerZh];
    if (mapped) out[mapped] = v;
  }

  return out;
}
