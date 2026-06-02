/**
 * actual_data 行 → 经营科目（中文表头名）聚合，供财务报表 / 预算对比使用
 */

import {
  OPERATING_DATA_EXTENSION_IMPORT_COLUMNS,
  type AssetImportFieldKind
} from "@/lib/operating-data-asset-field-meta";
import {
  OPERATING_BASE_BUSINESS_DB_MAP,
  OPERATING_BUDGET_ALIGNED_HEADERS,
  OPERATING_DB_KEY_TO_HEADER,
  OPERATING_HEADER_TO_DB_KEY
} from "@/lib/operating-data-master-schema";
import type { FinancialLineActual } from "@/lib/mock-analytics";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const RATIO_DB_KEYS = new Set(
  OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.filter((c) => c.kind === "ratio_or_percent").map((c) => c.dbKey)
);

const SUM_DB_KEYS = new Set<string>([
  ...Object.values(OPERATING_BASE_BUSINESS_DB_MAP),
  ...OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.filter(
    (c) => c.kind === "yuan" || c.kind === "wan" || c.kind === "count" || c.kind === "integer"
  ).map((c) => c.dbKey)
]);

function aggregateRatio(rows: Record<string, unknown>[], dbKey: string): number | null {
  let weightSum = 0;
  let weighted = 0;
  let simpleSum = 0;
  let simpleCount = 0;
  for (const row of rows) {
    const v = num(row[dbKey]);
    if (v == null) continue;
    const w = num(row.rooms_sold) ?? num(row.rooms_available) ?? 1;
    if (w > 0) {
      weighted += v * w;
      weightSum += w;
    }
    simpleSum += v;
    simpleCount += 1;
  }
  if (weightSum > 0) return weighted / weightSum;
  if (simpleCount > 0) return simpleSum / simpleCount;
  return null;
}

function aggregateSum(rows: Record<string, unknown>[], dbKey: string): number | null {
  let sum = 0;
  let any = false;
  for (const row of rows) {
    const v = num(row[dbKey]);
    if (v == null) continue;
    sum += v;
    any = true;
  }
  return any ? sum : null;
}

/**
 * 将多行 actual_data 聚合为「经营科目名 → 数值」（科目名与 Excel 表头一致）
 */
export function aggregateActualDataRowsToOperatingSubjects(
  rows: Record<string, unknown>[]
): Record<string, number> {
  if (rows.length === 0) return {};

  const out: Record<string, number> = {};

  for (const dbKey of new Set([...SUM_DB_KEYS, ...RATIO_DB_KEYS])) {
    const header = OPERATING_DB_KEY_TO_HEADER[dbKey];
    if (!header) continue;
    const v = RATIO_DB_KEYS.has(dbKey) ? aggregateRatio(rows, dbKey) : aggregateSum(rows, dbKey);
    if (v != null && Number.isFinite(v)) {
      out[header] = v;
    }
  }

  return out;
}

/** 经营科目名 → dbKey */
export function operatingSubjectLabelToDbKey(label: string): string | undefined {
  return OPERATING_HEADER_TO_DB_KEY[label];
}

/**
 * 用 actual_data 聚合结果覆盖 mock 利润表（仅映射已有 financialKey 的科目，并同步常用别名）
 */
export function mergeFinancialLineWithOperatingSubjects(
  base: FinancialLineActual,
  subjects: Record<string, number>
): FinancialLineActual {
  const next = { ...base };

  const revenue = subjects["营业收入"];
  if (revenue != null) next.营业收入 = revenue;

  const room = subjects["客房收入"];
  if (room != null) next.客房收入 = room;

  const other = subjects["其他业务收入"];
  if (other != null) next.其他收入 = other;

  const labor = subjects["人工成本"];
  if (labor != null) next.人力成本 = labor;

  const energy = subjects["能耗成本"];
  if (energy != null) next.能源费用 = energy;

  const mgmt = subjects["华住管理费"];
  if (mgmt != null) next.华住管理费 = mgmt;

  const roomSvc = subjects["客房服务成本"];
  if (roomSvc != null) next.客房服务成本 = roomSvc;

  const nonRoom = subjects["非客房服务成本"];
  if (nonRoom != null) next.非客房服务成本 = nonRoom;

  const opProfit = subjects["运营利润"] ?? subjects["利润"];
  if (opProfit != null) next.营业利润 = opProfit;

  const net = subjects["净利润"];
  if (net != null && subjects["运营利润"] == null && subjects["利润"] == null) {
    next.营业利润 = net;
  }

  next.毛利 = next.营业收入 - (next.原材料成本 + next.人力成本 * 0.55 + next.能源费用 * 0.8);
  next.利润率 = next.营业收入 > 0 ? next.营业利润 / next.营业收入 : 0;

  return next;
}

/** 仅基于 actual_data 聚合科目生成利润表行（不掺入 mock 演示数） */
export function financialLineFromOperatingSubjectsOnly(
  subjects: Record<string, number>
): FinancialLineActual {
  const empty: FinancialLineActual = {
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
  return mergeFinancialLineWithOperatingSubjects(empty, subjects);
}

export type OperatingReportGroup =
  | "收入类"
  | "成本类"
  | "利润类"
  | "房量类"
  | "渠道类"
  | "风险类";

const REPORT_GROUP_BY_HEADER: Record<string, OperatingReportGroup> = {
  营业收入: "收入类",
  客房收入: "收入类",
  其他业务收入: "收入类",
  营业外收入: "收入类",
  总成本: "成本类",
  营业成本: "成本类",
  运营成本: "成本类",
  销售费用: "成本类",
  非客房服务成本: "成本类",
  客房服务成本: "成本类",
  华住管理费: "成本类",
  房租: "成本类",
  税金及附加: "成本类",
  员工奖金: "成本类",
  后勤奖金: "成本类",
  店长奖金: "成本类",
  装修及固定资产摊销: "成本类",
  管理费用: "成本类",
  利润: "利润类",
  运营利润: "利润类",
  净利润: "利润类",
  摊销后纯利润: "利润类",
  可售房晚: "房量类",
  已售房晚: "房量类",
  时租房间数: "房量类",
  过夜房间数: "房量类",
  OTA间夜占比: "渠道类",
  会员间夜占比: "渠道类",
  协议客户占比: "渠道类",
  散客占比: "渠道类",
  直销占比: "渠道类",
  差评数: "风险类",
  投诉数: "风险类",
  异常维修数: "风险类",
  员工流失率: "风险类",
  同商圈新增竞品数: "风险类"
};

export type OperatingReportLine = {
  label: string;
  group: OperatingReportGroup;
  actual: number;
  budget: number;
  variance: number;
  unit: string;
};

function unitForHeader(header: string): string {
  const dbKey = OPERATING_HEADER_TO_DB_KEY[header];
  if (!dbKey) return "";
  const ext = OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.find((c) => c.dbKey === dbKey);
  const kind: AssetImportFieldKind | "integer" =
    ext?.kind ?? (header === "可售房晚" || header === "已售房晚" ? "integer" : "yuan");
  if (kind === "ratio_or_percent") return "%";
  if (kind === "yuan" || kind === "wan") return "元";
  if (kind === "integer") return "间夜/间";
  if (kind === "count") return "次/条";
  return "";
}

/** 按用户需求第五节分组展示经营科目实际 vs 预算 */
export function buildOperatingReportLines(
  actualSubjects: Record<string, number>,
  budgetSubjects: Record<string, number>
): OperatingReportLine[] {
  return OPERATING_BUDGET_ALIGNED_HEADERS.map((label) => {
    const actual = actualSubjects[label] ?? 0;
    const budget = budgetSubjects[label] ?? 0;
    return {
      label,
      group: REPORT_GROUP_BY_HEADER[label] ?? "收入类",
      actual,
      budget,
      variance: actual - budget,
      unit: unitForHeader(label)
    };
  });
}

export const OPERATING_REPORT_GROUP_ORDER: OperatingReportGroup[] = [
  "收入类",
  "成本类",
  "利润类",
  "房量类",
  "渠道类",
  "风险类"
];
