/**
 * 验收检查（仅读/校验）
 * npx --yes tsx scripts/acceptance-check.ts
 */
import * as XLSX from "xlsx";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { OPERATING_DATA_MASTER_TEMPLATE_HEADERS, OPERATING_BUDGET_ALIGNED_HEADERS } from "../lib/operating-data-master-schema";
import {
  OPERATING_DATA_CALCULATED_FIELD_ROWS,
  OPERATING_DATA_EXTENSION_IMPORT_COLUMNS,
  OPERATING_DATA_ASSET_IMPORT_HEADERS
} from "../lib/operating-data-asset-field-meta";
import { OPERATING_DATA_IMPORT_SHEET_NAME } from "../lib/operating-data-import-template";
import { parseOperatingDataWorkbook } from "../lib/operating-data-import-parse";
import { getFullBudgetSubjectCatalog, buildOperatingOnlyBudgetSubjects } from "../lib/operating-budget-subjects";
import { buildOperatingReportLines, OPERATING_REPORT_GROUP_ORDER } from "../lib/actual-data-subject-bridge";
import { computeVarianceRate, resolveVarianceStatus } from "../lib/budget-variance";
import { buildBudgetTemplateExampleRows } from "../lib/budget-import-template";
import { extensionFieldDescriptionGroupedBlocks } from "../lib/operating-data-asset-field-meta";
import { getDefaultExampleStoreLabel } from "../lib/active-store-scope";

const failures: string[] = [];
const passes: string[] = [];

function pass(msg: string) {
  passes.push(`✓ ${msg}`);
}
function fail(msg: string) {
  failures.push(`✗ ${msg}`);
}

if (OPERATING_DATA_MASTER_TEMPLATE_HEADERS.length === 42) {
  pass("master schema 表头数量 = 42");
} else {
  fail(`master schema 表头数量 = ${OPERATING_DATA_MASTER_TEMPLATE_HEADERS.length}`);
}

const dir = mkdtempSync(join(tmpdir(), "ft-accept-"));
const xlsxPath = join(dir, "t.xlsx");
const { utils } = XLSX;
const 门店示例 = getDefaultExampleStoreLabel();
const base: (string | number)[] = [门店示例, "month", "2026-04", 3000000, 2100000, 900000, 3000, 2250, 2700000];
const extras = OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.map((col) => {
  if (col.kind === "ratio_or_percent") return "35%";
  if (col.kind === "integer" || col.kind === "count") return 100;
  return 180000;
});
const 数据表头 = [...OPERATING_DATA_MASTER_TEMPLATE_HEADERS];
const wsData = utils.aoa_to_sheet([数据表头, [...base, ...extras]]);
const descRows: string[][] = [["字段分组", "表头名称", "库表 actual_data 字段", "填写说明", "单位 / 格式"]];
descRows.push(["【基础信息】", "", "", "", ""]);
descRows.push(["基础信息", "门店", "store_id", "", "文本"]);
descRows.push(["基础信息", "账期类型", "period_type", "", ""]);
descRows.push(["基础信息", "账期", "period_value", "", ""]);
descRows.push(["【经营结果】", "", "", "", ""]);
descRows.push(["经营结果", "营业收入", "revenue", "", "元"]);
descRows.push(["经营结果", "总成本", "total_cost", "", "元"]);
descRows.push(["经营结果", "利润", "profit", "", "元"]);
descRows.push(["【酒店房量指标】", "", "", "", ""]);
descRows.push(["酒店房量指标", "可售房晚", "rooms_available", "", ""]);
descRows.push(["酒店房量指标", "已售房晚", "rooms_sold", "", ""]);
descRows.push(["酒店房量指标", "客房收入", "room_revenue", "", "元"]);
for (const block of extensionFieldDescriptionGroupedBlocks()) {
  descRows.push([block.title, "", "", "", ""]);
  for (const line of [...block.inputRows, ...block.calculatedRows]) descRows.push(line);
}
const wsDesc = utils.aoa_to_sheet(descRows);
const wb = utils.book_new();
utils.book_append_sheet(wb, wsData, OPERATING_DATA_IMPORT_SHEET_NAME);
utils.book_append_sheet(wb, wsDesc, "字段说明");
writeFileSync(xlsxPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

const wbRead = XLSX.read(readFileSync(xlsxPath), { type: "buffer" });
pass("可生成含「数据模板」「字段说明」的工作簿");

const dataSheet = wbRead.Sheets[OPERATING_DATA_IMPORT_SHEET_NAME];
const descSheet = wbRead.Sheets["字段说明"];
if (dataSheet && descSheet) pass("两个 sheet 均存在");
else fail("缺少 sheet");

const rowsAoA = XLSX.utils.sheet_to_json<unknown[]>(dataSheet!, { header: 1, defval: "" });
const headers = (rowsAoA[0] as string[]) ?? [];
if (headers.length === 42) pass("数据模板首行 42 列");
else fail(`数据模板首行 ${headers.length} 列`);

if (OPERATING_DATA_MASTER_TEMPLATE_HEADERS.every((h, i) => headers[i] === h)) {
  pass("表头与 master schema 顺序一致");
} else {
  const missing = [...OPERATING_DATA_MASTER_TEMPLATE_HEADERS].filter((h) => !headers.includes(h));
  if (missing.length) fail(`缺少表头: ${missing.join(", ")}`);
  else fail("表头顺序与 master 不一致");
}

const descRowsJson = XLSX.utils.sheet_to_json<Record<string, string>>(descSheet!, { defval: "" });
const names = new Set(descRowsJson.map((r) => String(r["表头名称"] ?? "").trim()).filter(Boolean));
const inputHeaders = OPERATING_DATA_MASTER_TEMPLATE_HEADERS.filter((h) => !["门店", "账期类型", "账期"].includes(h));
if (inputHeaders.every((h) => names.has(h))) pass("字段说明覆盖全部 39 个经营输入字段");
else fail(`字段说明缺: ${inputHeaders.filter((h) => !names.has(h)).join(", ")}`);

const calcMissing = OPERATING_DATA_CALCULATED_FIELD_ROWS.filter((c) => !names.has(c.headerZh));
if (calcMissing.length === 0) pass(`字段说明含 ${OPERATING_DATA_CALCULATED_FIELD_ROWS.length} 个计算项`);
else fail(`缺计算项: ${calcMissing.map((c) => c.headerZh).slice(0, 3).join(", ")}…`);

const parsed = parseOperatingDataWorkbook(wbRead, XLSX);
if (parsed.ok && parsed.rows[0] && parsed.rows[0].errors.length === 0) {
  pass("示例行 parser 无错误");
} else fail("示例行 parser 失败");

const fullRaw: Record<string, unknown> = {};
for (const h of OPERATING_DATA_MASTER_TEMPLATE_HEADERS) {
  if (h === "门店") fullRaw[h] = 门店示例;
  else if (h === "账期类型") fullRaw[h] = "month";
  else if (h === "账期") fullRaw[h] = "2026-04";
  else if (h.includes("占比") || h === "员工流失率") fullRaw[h] = "10%";
  else if (h.includes("数") && !h.includes("收入") && !h.includes("房晚")) fullRaw[h] = 1;
  else fullRaw[h] = 100;
}
const wb2 = utils.book_new();
utils.book_append_sheet(wb2, utils.json_to_sheet([fullRaw], { header: [...OPERATING_DATA_MASTER_TEMPLATE_HEADERS] }), OPERATING_DATA_IMPORT_SHEET_NAME);
const p2 = parseOperatingDataWorkbook(wb2, XLSX);
if (p2.ok && p2.rows[0]?.errors.length === 0) {
  const dbKeys = new Set(Object.keys(p2.rows[0]!.assetValues));
  const extDb = OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.map((c) => c.dbKey);
  if (extDb.every((k) => dbKeys.has(k))) pass("全字段填充后解析 33 个扩展 dbKey");
  else fail(`缺 dbKey: ${extDb.filter((k) => !dbKeys.has(k)).join(", ")}`);
} else fail("全字段填充解析失败");

const catalogLabels = new Set(getFullBudgetSubjectCatalog().map((s) => s.label));
const budgetSubjects = new Set(buildBudgetTemplateExampleRows().map((r) => String(r.科目)));
const alias: Record<string, string> = {
  营业收入: "总营业收入",
  可售房晚: "可售房间数",
  已售房晚: "已售房间数",
  差评数: "差评控制目标",
  投诉数: "投诉数量控制"
};
const missingBudget = OPERATING_BUDGET_ALIGNED_HEADERS.filter((h) => {
  const label = alias[h] ?? h;
  return !catalogLabels.has(label) && !budgetSubjects.has(label);
});
if (missingBudget.length === 0) pass("预算模板覆盖全部经营可预算字段");
else fail(`预算缺: ${missingBudget.join(", ")}`);
pass(`完整预算科目 ${getFullBudgetSubjectCatalog().length}（+${buildOperatingOnlyBudgetSubjects().length} 经营派生）`);

const lines = buildOperatingReportLines(
  Object.fromEntries(OPERATING_BUDGET_ALIGNED_HEADERS.map((h, i) => [h, i + 1])),
  {}
);
for (const g of OPERATING_REPORT_GROUP_ORDER) {
  if (lines.some((l) => l.group === g)) pass(`报表分组「${g}」`);
  else fail(`缺分组「${g}」`);
}

const vr = computeVarianceRate(100, 120);
if (vr.rate === 0.2) pass("差异率 (实际-预算)/预算");
else fail("差异率计算错误");

const v0 = computeVarianceRate(0, 50);
if (v0.rate === null && v0.label === "预算为0") pass("预算为 0 无 NaN/Infinity");

const riskBad = resolveVarianceStatus("risk", 5, 0, 5);
if (riskBad.status === "风险") pass("risk + 预算0 + 实际>0 → 风险");
else fail(`risk 判定: ${riskBad.status}（应为风险）`);

const riskOver = resolveVarianceStatus("risk", 2, 5, 7);
if (riskOver.status === "风险") pass("risk 实际>预算 → 风险");
else fail(`risk 超标: ${riskOver.status}`);

const cost0 = resolveVarianceStatus("cost", 3, 0, 3);
if (cost0.status === "超支") pass("cost + 预算0 + 实际>0 → 超支");
else fail(`cost 判定: ${cost0.status}`);

const rev0 = resolveVarianceStatus("revenue", 10, 0, 10);
if (rev0.status === "达标" && rev0.tone === "good") pass("revenue + 预算0 + 实际>0 → 达标");
else fail(`revenue 判定: ${rev0.status}/${rev0.tone}`);

console.log("\n=== 验收结果 ===\n");
passes.forEach((p) => console.log(p));
if (failures.length) {
  failures.forEach((f) => console.log(f));
  console.log(`\n${passes.length} 通过, ${failures.length} 失败`);
  process.exit(1);
}
console.log(`\n全部 ${passes.length} 项通过`);
