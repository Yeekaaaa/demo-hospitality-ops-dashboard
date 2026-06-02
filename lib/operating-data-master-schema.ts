/**
 * 经营实际数据模板 master schema（39 个表头字段，顺序固定）
 * 下载模板、导入解析、字段说明、actual_data、预算科目派生均以此为准。
 */

import {
  OPERATING_DATA_EXTENSION_IMPORT_COLUMNS,
  type AssetFieldDescriptionGroup,
  type AssetImportFieldKind
} from "@/lib/operating-data-asset-field-meta";

export const OPERATING_DATA_META_HEADERS = ["门店", "账期类型", "账期"] as const;

/** 基础经营字段（接在账期之后，共 6 列） */
export const OPERATING_DATA_BASE_BUSINESS_HEADERS = [
  "营业收入",
  "总成本",
  "利润",
  "可售房晚",
  "已售房晚",
  "客房收入"
] as const;

export type OperatingBaseBusinessHeader = (typeof OPERATING_DATA_BASE_BUSINESS_HEADERS)[number];

/** 基础列 → actual_data 字段 */
export const OPERATING_BASE_BUSINESS_DB_MAP: Record<OperatingBaseBusinessHeader, string> = {
  营业收入: "revenue",
  总成本: "total_cost",
  利润: "profit",
  可售房晚: "rooms_available",
  已售房晚: "rooms_sold",
  客房收入: "room_revenue"
};

/** 「数据模板」sheet 完整表头（39 列） */
export const OPERATING_DATA_MASTER_TEMPLATE_HEADERS = [
  ...OPERATING_DATA_META_HEADERS,
  ...OPERATING_DATA_BASE_BUSINESS_HEADERS,
  ...OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.map((c) => c.headerZh)
] as const;

export type OperatingDataMasterTemplateHeader = (typeof OPERATING_DATA_MASTER_TEMPLATE_HEADERS)[number];

/** 表头中文 → dbKey（含基础 6 列 + 扩展 30 列，不含 meta） */
export const OPERATING_HEADER_TO_DB_KEY: Record<string, string> = {
  ...OPERATING_BASE_BUSINESS_DB_MAP,
  ...Object.fromEntries(OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.map((c) => [c.headerZh, c.dbKey]))
};

/** dbKey → 表头中文 */
export const OPERATING_DB_KEY_TO_HEADER: Record<string, string> = Object.fromEntries(
  Object.entries(OPERATING_HEADER_TO_DB_KEY).map(([h, k]) => [k, h])
);

/** 经营模板中需纳入预算对比的经营科目（不含 meta） */
export const OPERATING_BUDGET_ALIGNED_HEADERS = [
  ...OPERATING_DATA_BASE_BUSINESS_HEADERS,
  ...OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.map((c) => c.headerZh)
] as const;

export function kindForOperatingDbKey(dbKey: string): AssetImportFieldKind | "meta" {
  const ext = OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.find((c) => c.dbKey === dbKey);
  if (ext) return ext.kind;
  if (dbKey === "rooms_available" || dbKey === "rooms_sold") return "integer";
  if (
    [
      "revenue",
      "total_cost",
      "profit",
      "room_revenue",
      "business_cost",
      "operating_cost",
      "operating_profit"
    ].includes(dbKey)
  ) {
    return "wan";
  }
  return "wan";
}

export function fieldGroupForDbKey(dbKey: string): AssetFieldDescriptionGroup | "基础信息" {
  if (["store_id", "period_type", "period_value"].includes(dbKey)) return "基础信息";
  const ext = OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.find((c) => c.dbKey === dbKey);
  if (ext) return ext.fieldGroup;
  if (["revenue", "total_cost", "profit"].includes(dbKey)) return "经营结果";
  if (["rooms_available", "rooms_sold", "room_revenue"].includes(dbKey)) return "酒店房量指标";
  return "经营结果";
}
