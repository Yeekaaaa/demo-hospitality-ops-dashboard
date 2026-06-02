/**
 * 经营数据导入 Excel 模板（与驾驶舱 actual_data 口径对齐，供下载）
 */

import {
  extensionFieldDescriptionGroupedBlocks,
  OPERATING_DATA_ASSET_IMPORT_HEADERS
} from "@/lib/operating-data-asset-field-meta";
import { OPERATING_DATA_MASTER_TEMPLATE_HEADERS } from "@/lib/operating-data-master-schema";
import { getDefaultExampleStoreLabel } from "@/lib/active-store-scope";

type XlsxModule = typeof import("xlsx");
type WorkSheet = import("xlsx").WorkSheet;
type CellObject = import("xlsx").CellObject;
type Range = import("xlsx").Range;

/** 与下载模板、上传解析共用，勿随意改名 */
export const OPERATING_DATA_IMPORT_SHEET_NAME = "数据模板";
const 说明表名 = "字段说明";

export const OPERATING_DATA_IMPORT_HEADERS = [
  "门店",
  "账期类型",
  "账期",
  "营业收入",
  "总成本",
  "利润",
  "可售房晚",
  "已售房晚",
  "客房收入"
] as const;

export type OperatingDataImportHeader = (typeof OPERATING_DATA_IMPORT_HEADERS)[number];

/** 完整表头：与 master schema 一致（39 列） */
export const OPERATING_DATA_FULL_IMPORT_HEADERS = OPERATING_DATA_MASTER_TEMPLATE_HEADERS;

const 数据表头 = [...OPERATING_DATA_FULL_IMPORT_HEADERS];

if (数据表头.length !== 39) {
  throw new Error(`经营数据模板表头应为 39 列，当前为 ${数据表头.length} 列`);
}

const 说明表头 = ["字段分组", "表头名称", "库表 actual_data 字段", "填写说明", "单位 / 格式"] as const;

const 客房收入说明 =
  "酒店客房相关收入，单位为元；ADR、客房 RevPAR 等为系统计算字段，见本表【酒店房量指标】。";

const 填写注意全文 = `⚠ 填写注意：
1. 金额字段单位统一为元，不要填写为万元。
2. 房晚字段填写间夜数，建议为整数。
3. 占比字段可填写 31% 或 0.31，系统会自动识别。
4. 请不要修改「数据模板」sheet 的表头名称，否则上传解析可能失败。
5. 如果只填基础经营数据，可只填写到「客房收入」；增强字段可后续逐步补充。
6. 酒店门店建议填写房晚、客房收入、渠道结构、人工成本率、能耗成本率、GOP率、现金流、投诉差评等字段。
7. 餐饮门店可不填写房晚和客房收入，重点填写收入、成本、利润、人工成本、现金流、投诉等字段。`;

function 示例行(): (string | number)[] {
  const 门店示例 = getDefaultExampleStoreLabel();
  const base: (string | number)[] = [
    门店示例,
    "month",
    "2026-04",
    3000000,
    2100000,
    900000,
    3000,
    2250,
    2700000
  ];
  const extras: (string | number)[] = [
    1800000,
    450000,
    950000,
    150,
    2100,
    "35%",
    "28%",
    "12%",
    "15%",
    "10%",
    70000,
    80000,
    420000,
    150000,
    220000,
    50000,
    120000,
    30000,
    40000,
    90000,
    50000,
    180000,
    20000,
    720000,
    650000,
    80000,
    30000,
    20000,
    "5%",
    1
  ];
  if (extras.length !== OPERATING_DATA_ASSET_IMPORT_HEADERS.length) {
    throw new Error(
      `示例扩展列数(${extras.length})与表头列数(${OPERATING_DATA_ASSET_IMPORT_HEADERS.length})不一致，请同步维护。`
    );
  }
  return [...base, ...extras];
}

/** 构建「字段说明」数据行 + 合并区域（分组标题、底部「填写注意」为 A:E 合并） */
function buildDescriptionSheetModel(): { rows: string[][]; merges: Range[] } {
  const merges: Range[] = [];
  const rows: string[][] = [];

  const pushMergedRow = (firstCell: string) => {
    const r = rows.length;
    rows.push([firstCell, "", "", "", ""]);
    merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  };

  rows.push([...说明表头]);

  pushMergedRow("【基础信息】");
  rows.push([
    "基础信息",
    "门店",
    "store_id（解析后）",
    "填写系统中的门店名称，如：沐家-全季槐安西；系统会自动匹配门店。不要填写简称或错别字。",
    "文本"
  ]);
  rows.push([
    "基础信息",
    "账期类型",
    "period_type",
    "仅允许填写：month / quarter / year。月度数据填 month，季度数据填 quarter，年度数据填 year。",
    "month / quarter / year"
  ]);
  rows.push([
    "基础信息",
    "账期",
    "period_value",
    "月度填 YYYY-MM，如 2026-04；季度填 YYYY-Q1 / YYYY-Q2 / YYYY-Q3 / YYYY-Q4；年度填 YYYY，如 2026。",
    "文本"
  ]);

  pushMergedRow("【经营结果】");
  rows.push([
    "经营结果",
    "营业收入",
    "revenue",
    "本账期门店总营业收入，单位为元。例：3000000 表示 300 万元。",
    "元"
  ]);
  rows.push([
    "经营结果",
    "总成本",
    "total_cost",
    "本账期门店总成本，单位为元。建议与财务口径保持一致。",
    "元"
  ]);
  rows.push([
    "经营结果",
    "利润",
    "profit",
    "利润 = 营业收入 - 总成本；建议填写，若不填系统会按收入减成本自动计算。",
    "元"
  ]);

  pushMergedRow("【酒店房量指标】");
  rows.push([
    "酒店房量指标",
    "可售房晚",
    "rooms_available",
    "酒店门店填写；餐饮门店可留空。例：100间房 × 30天 = 3000。",
    "间夜数"
  ]);
  rows.push([
    "酒店房量指标",
    "已售房晚",
    "rooms_sold",
    "酒店门店填写；用于计算出租率和 ADR。餐饮门店可留空。",
    "间夜数"
  ]);
  rows.push(["酒店房量指标", "客房收入", "room_revenue", 客房收入说明, "元"]);

  for (const block of extensionFieldDescriptionGroupedBlocks()) {
    pushMergedRow(block.title);
    for (const line of block.inputRows) {
      rows.push(line);
    }
    for (const line of block.calculatedRows) {
      rows.push(line);
    }
  }

  pushMergedRow("【兼容旧版模板】");
  rows.push([
    "成本结构",
    "（旧）人工成本等",
    "labor_cost 等",
    "旧版 Excel 若仍含「人工成本、GOP、经营现金流」等列，上传后仍可写入库；新下载模板已不再包含这些输入列。",
    "仅兼容导入"
  ]);

  rows.push(["", "", "", "", ""]);
  pushMergedRow(填写注意全文);

  return { rows, merges };
}

/** 「数据模板」首行表头样式 + 冻结首行 */
function applyDataSheetHeaderPresentation(ws: WorkSheet, utils: XlsxModule["utils"], columnCount: number) {
  for (let c = 0; c < columnCount; c++) {
    const addr = utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (!cell || typeof cell !== "object") continue;
    (cell as CellObject).s = {
      font: { bold: true, sz: 11 },
      fill: { patternType: "solid", fgColor: { rgb: "E8EDF5" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true }
    } as CellObject["s"];
  }
  ws["!views"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2", activeCell: "A2", showGridLines: true }];
  const endCell = utils.encode_cell({ r: 0, c: columnCount - 1 });
  ws["!autofilter"] = { ref: `A1:${endCell}` };
}

/** 「字段说明」表头 + 正文换行 + 分组标题行 / 底部「填写注意」样式 */
function applyDescriptionSheetPresentation(ws: WorkSheet, utils: XlsxModule["utils"], merges: Range[]) {
  const colCount = 说明表头.length;
  for (let c = 0; c < colCount; c++) {
    const addr = utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (!cell || typeof cell !== "object") continue;
    (cell as CellObject).s = {
      font: { bold: true, sz: 11 },
      fill: { patternType: "solid", fgColor: { rgb: "E8EDF5" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true }
    } as CellObject["s"];
  }
  ws["!views"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2", activeCell: "A2", showGridLines: true }];

  const ref = ws["!ref"];
  if (!ref) return;
  const range = utils.decode_range(ref);
  for (let R = 1; R <= range.e.r; R++) {
    for (let C = 0; C <= range.e.c; C++) {
      const addr = utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell || typeof cell !== "object") continue;
      const prev = ((cell as CellObject).s || {}) as Record<string, unknown>;
      const prevAlign = (prev.alignment as Record<string, unknown> | undefined) || {};
      (cell as CellObject).s = {
        ...prev,
        alignment: { ...prevAlign, wrapText: true, vertical: "top" }
      } as CellObject["s"];
    }
  }

  const gold = "D9A441";
  for (const m of merges) {
    const addr = utils.encode_cell(m.s);
    const cell = ws[addr];
    if (!cell || cell.v == null || typeof cell.v !== "string") continue;
    const v = cell.v;
    if (v.includes("填写注意") || v.trimStart().startsWith("⚠")) {
      (cell as CellObject).s = {
        font: { bold: true, sz: 11 },
        fill: { patternType: "solid", fgColor: { rgb: "FFF9E6" } },
        alignment: { horizontal: "left", vertical: "top", wrapText: true },
        border: {
          top: { style: "medium", color: { rgb: gold } },
          bottom: { style: "medium", color: { rgb: gold } },
          left: { style: "medium", color: { rgb: gold } },
          right: { style: "medium", color: { rgb: gold } }
        }
      } as CellObject["s"];
    } else if (v.startsWith("【") && v.endsWith("】")) {
      (cell as CellObject).s = {
        font: { bold: true, sz: 12 },
        fill: { patternType: "solid", fgColor: { rgb: "E8EDF5" } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true }
      } as CellObject["s"];
    }
  }
}

export function downloadOperatingDataImportTemplate(xlsx: XlsxModule): void {
  const { utils, writeFile } = xlsx;

  const 数据行: (string | number)[][] = [数据表头, 示例行()];
  const wsData = utils.aoa_to_sheet(数据行);
  const baseW = [
    { wch: 30 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 }
  ];
  const extraW = OPERATING_DATA_ASSET_IMPORT_HEADERS.map(() => ({ wch: 15 }));
  wsData["!cols"] = [...baseW, ...extraW];
  applyDataSheetHeaderPresentation(wsData, utils, 数据表头.length);

  const { rows: descRows, merges } = buildDescriptionSheetModel();
  const wsDesc = utils.aoa_to_sheet(descRows);
  wsDesc["!merges"] = merges;
  wsDesc["!cols"] = [
    { wch: 14 },
    { wch: 20 },
    { wch: 30 },
    { wch: 78 },
    { wch: 24 }
  ];
  applyDescriptionSheetPresentation(wsDesc, utils, merges);

  const wb = utils.book_new();
  utils.book_append_sheet(wb, wsData, OPERATING_DATA_IMPORT_SHEET_NAME);
  utils.book_append_sheet(wb, wsDesc, 说明表名);

  writeFile(wb, "经营数据导入模板.xlsx", { bookType: "xlsx", cellStyles: true });
}
