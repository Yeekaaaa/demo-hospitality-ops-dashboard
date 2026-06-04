/**
 * 预算 Excel 模板下载（长表：门店 × 年月 × 科目）
 */

import { BUDGET_SUBJECT_DEMO_VALUES } from "@/lib/budget-subjects";
import { getFullBudgetSubjectCatalog } from "@/lib/operating-budget-subjects";
import { filterActiveMockStores, getDefaultExampleStoreLabel } from "@/lib/active-store-scope";
import { getBudgetVersionLabel } from "@/lib/budget-versions";
import type { StoreMaster } from "@/lib/store-master";

type XlsxModule = typeof import("xlsx");

export const BUDGET_IMPORT_SHEET_NAME = "预算模板";
const DESC_SHEET = "字段说明";

export const BUDGET_IMPORT_HEADERS = [
  "门店",
  "年份",
  "月份",
  "季度",
  "预算版本",
  "科目",
  "预算值",
  "单位",
  "备注"
] as const;

function storeLabel(s: StoreMaster): string {
  return `${s.品牌}-${s.门店名称}`;
}

/** 生成单店单月全部科目示例行 */
export function buildBudgetTemplateExampleRows(opts?: {
  storeName?: string;
  year?: number;
  month?: number;
  quarter?: string;
}): Array<Record<string, string | number>> {
  const active = filterActiveMockStores();
  const hotelB = active.find((s) => s.品牌.includes("示例酒店 B")) ?? active[0];
  const store = opts?.storeName ?? (hotelB ? storeLabel(hotelB) : getDefaultExampleStoreLabel());
  const year = opts?.year ?? 2026;
  const month = opts?.month ?? 4;
  const quarter = opts?.quarter ?? "Q2";

  const versionLabel = getBudgetVersionLabel("base");
  return getFullBudgetSubjectCatalog().map((s) => ({
    门店: store,
    年份: year,
    月份: month,
    季度: quarter,
    预算版本: versionLabel,
    科目: s.label,
    预算值: BUDGET_SUBJECT_DEMO_VALUES[s.label] ?? 0,
    单位: s.unit,
    备注: "示例，可修改"
  }));
}

function buildDescriptionRows(): string[][] {
  const header = ["字段分组", "字段名称", "是否必填", "单位", "填写说明", "示例"];
  const rows: string[][] = [header];
  const versionLabel = getBudgetVersionLabel("base");

  rows.push([
    "表头字段",
    "门店",
    "必填",
    "文本",
    "与系统门店主数据一致，如：示例酒店 A-核心店、示例餐厅。",
    "示例酒店 B-商务店"
  ]);
  rows.push(["表头字段", "年份", "必填", "四位数字", "如 2026。", "2026"]);
  rows.push(["表头字段", "月份", "必填*", "1-12", "月度预算填 1-12；若按季度汇总可留空月份并填季度。", "4"]);
  rows.push(["表头字段", "季度", "选填", "Q1-Q4", "可填 Q1、Q2、Q3、Q4；与月份二选一为主。", "Q2"]);
  rows.push([
    "表头字段",
    "预算版本",
    "选填",
    "文本",
    "月度执行版 / 年度目标版 / 调整预测版 / 老板确认版；留空默认月度执行版。",
    versionLabel
  ]);
  rows.push(["表头字段", "科目", "必填", "文本", "必须来自「标准预算科目」清单，见下方分组列表。", "总营业收入"]);
  rows.push([
    "表头字段",
    "预算值",
    "必填",
    "数字",
    "收入/成本/利润/现金流类为元；ADR/RevPAR/客单价为元；占比为 %。",
    "1800000"
  ]);
  rows.push(["表头字段", "单位", "选填", "文本", "建议与科目默认单位一致，导入时不强制校验。", "元"]);
  rows.push(["表头字段", "备注", "选填", "文本", "可填写编制说明、假设、口径备注。", "示例，可修改"]);
  rows.push(["", "", "", "", "", ""]);

  let currentGroup = "";
  for (const s of getFullBudgetSubjectCatalog()) {
    if (s.group !== currentGroup) {
      currentGroup = s.group;
      rows.push([`【${currentGroup}】`, "", "", "", "", ""]);
    }
    rows.push([s.group, s.label, "选填", s.unit, s.description, String(BUDGET_SUBJECT_DEMO_VALUES[s.label] ?? 0)]);
  }

  rows.push(["", "", "", "", "", ""]);
  rows.push([
    "注意事项",
    "—",
    "—",
    "—",
    "1. 请勿修改「预算模板」sheet 表头名称。2. 收入/成本/利润类金额统一为元。3. 未知科目将无法导入。4. 同一门店+年月+科目重复行以后写入为准。",
    ""
  ]);

  return rows;
}

export function createBudgetImportWorkbook(
  xlsx: XlsxModule,
  opts?: Parameters<typeof buildBudgetTemplateExampleRows>[0]
): import("xlsx").WorkBook {
  const { utils } = xlsx;
  const dataRows = buildBudgetTemplateExampleRows(opts);
  const wsData = utils.json_to_sheet(dataRows, { header: [...BUDGET_IMPORT_HEADERS] });
  wsData["!cols"] = [
    { wch: 28 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 }
  ];

  const wsDesc = utils.aoa_to_sheet(buildDescriptionRows());
  wsDesc["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 56 }, { wch: 14 }];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, wsData, BUDGET_IMPORT_SHEET_NAME);
  utils.book_append_sheet(wb, wsDesc, DESC_SHEET);
  return wb;
}

export function downloadBudgetImportTemplate(
  xlsx: XlsxModule,
  opts?: Parameters<typeof buildBudgetTemplateExampleRows>[0]
): void {
  const wb = createBudgetImportWorkbook(xlsx, opts);
  xlsx.writeFile(wb, "预算导入模板.xlsx");
}
