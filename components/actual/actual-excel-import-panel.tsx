"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileUp, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildActualStorageKey,
  type ActualHotelKey,
  type ActualFinancialKey,
  type ActualOverrideMap,
  type ActualOverrideValues
} from "@/lib/actual-overrides";
import type { ReportPeriod } from "@/lib/mock-analytics";
import { 全部门店值, 门店主数据 } from "@/lib/store-master";

/** 旧面板模板/纠错示例用门店（与 store-master 演示主数据一致） */
const DEMO_EXAMPLE_STORE_DISPLAY = "示例酒店 A｜核心店｜示例城市";

declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer, opts: { type: "array" }) => {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
      };
      utils: {
        sheet_to_json: <T>(sheet: unknown, opts: { defval: string }) => T[];
        json_to_sheet: (rows: Array<Record<string, string | number>>) => unknown;
        book_new: () => unknown;
        book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
      };
      writeFile: (wb: unknown, name: string) => void;
    };
  }
}

type Row = Record<string, unknown>;
type Mode = "hotel" | "financial";
type FieldKey =
  | "门店"
  | "年份"
  | "月份"
  | "季度"
  | "可售间夜数"
  | "已售间数"
  | "出租率"
  | "平均房价"
  | "RevPAR"
  | "营业收入"
  | "客房收入"
  | "餐饮收入"
  | "其他收入"
  | "人力成本"
  | "能源费用"
  | "华住管理费"
  | "客房服务成本"
  | "非客房服务成本"
  | "原材料成本"
  | "营业利润";
type Mapping = Record<FieldKey, string>;
type ResultFilter = "全部" | "成功" | "警告" | "失败";
type IssueLevel = "warning" | "error";
type IssueWithFix = {
  row: number;
  reason: string;
  level: IssueLevel;
  store: string;
  year: string;
  monthOrQuarter: string;
  field: string;
  suggestion: string;
};

const aliases: Record<FieldKey, string[]> = {
  门店: ["门店", "门店名称"],
  年份: ["年份", "年"],
  月份: ["月份", "月"],
  季度: ["季度", "季"],
  可售间夜数: ["可售间夜数"],
  已售间数: ["已售间数"],
  出租率: ["出租率", "入住率"],
  平均房价: ["平均房价", "ADR"],
  RevPAR: ["RevPAR", "综合RevPAR"],
  营业收入: ["营业收入", "总营业收入"],
  客房收入: ["客房收入", "客房营业收入"],
  餐饮收入: ["餐饮收入"],
  其他收入: ["其他收入"],
  人力成本: ["人力成本"],
  能源费用: ["能源费用"],
  华住管理费: ["品牌管理费", "华住管理费"],
  客房服务成本: ["客房服务成本"],
  非客房服务成本: ["非客房服务成本"],
  原材料成本: ["原材料成本"],
  营业利润: ["营业利润", "金额", "实际值"]
};

function normalize(s: string) {
  return s.replace(/\s+/g, "").replace(/[｜|]/g, "").trim();
}
function findStoreId(nameRaw: string): string | null {
  const v = normalize(nameRaw);
  if (!v) return null;
  if (v === normalize("全部门店")) return 全部门店值;
  const exact = 门店主数据.find((s) => normalize(s.显示名称) === v || normalize(s.门店名称) === v);
  if (exact) return exact.id;
  const fuzzy = 门店主数据.find((s) => v.includes(normalize(s.门店名称)) || normalize(s.显示名称).includes(v));
  return fuzzy?.id ?? null;
}

function getSuggestion(reason: string, field: string) {
  if (reason.includes("门店名称无法识别")) return `请改为：${DEMO_EXAMPLE_STORE_DISPLAY}`;
  if (reason.includes("年份为空")) return "请填写 2026";
  if (reason.includes("年份格式异常")) return "请填写数字年份，例如 2026";
  if (reason.includes("月份 / 季度为空")) return "请至少填写月份或季度其中一项";
  if (reason.includes("数值不是数字")) return "请删除文字或逗号，仅保留数字";
  if (reason.includes("缺少门店")) return "请填写有效门店名称";
  if (field === "月份/季度") return "请仅填写一种账期维度";
  return "请按模板修正后重试";
}

const hotelFields: FieldKey[] = ["门店", "年份", "月份", "季度", "可售间夜数", "已售间数", "出租率", "平均房价", "RevPAR", "客房收入"];
const financialFields: FieldKey[] = [
  "门店",
  "年份",
  "月份",
  "季度",
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

function fieldDisplayLabel(f: FieldKey): string {
  return f === "华住管理费" ? "品牌管理费" : f;
}

export function ActualExcelImportPanel({
  mode,
  existingOverrides,
  onImport
}: {
  mode: Mode;
  existingOverrides: ActualOverrideMap;
  onImport: (entries: ActualOverrideMap) => void;
}) {
  const fields = mode === "hotel" ? hotelFields : financialFields;
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Mapping>({} as Mapping);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("全部");
  const [focusedIssueKey, setFocusedIssueKey] = useState<string>("");
  const [mappingExpanded, setMappingExpanded] = useState(true);
  const [importSuccessOnly, setImportSuccessOnly] = useState(false);
  const mappingRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (window.XLSX) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.async = true; s.onload = () => setReady(true);
    document.body.appendChild(s);
    return () => s.remove();
  }, []);

  const autoMap = (hdrs: string[]) => {
    const next = {} as Mapping;
    fields.forEach((f) => {
      const found = hdrs.find((h) => aliases[f].some((a) => normalize(a) === normalize(h)));
      next[f] = found ?? "";
    });
    setMapping(next);
  };

  const parseResult = useMemo(() => {
    const issues: IssueWithFix[] = [];
    const entries: ActualOverrideMap = {};
    let overwriteCount = 0;
    const rowResults: Array<{
      row: number;
      status: "成功" | "警告" | "失败";
      store: string;
      year: string;
      monthOrQuarter: string;
      messages: string[];
    }> = [];
    rows.forEach((row, idx) => {
      const rowNo = idx + 2;
      const storeRaw = String(row[mapping["门店"]] ?? "").trim();
      const yearRaw = String(row[mapping["年份"]] ?? "").trim();
      const monthRaw = String(row[mapping["月份"]] ?? "").trim();
      const quarterRaw = String(row[mapping["季度"]] ?? "").trim();
      const rowMsgs: string[] = [];
      const addIssue = (
        level: IssueLevel,
        reason: string,
        field: string
      ) => {
        issues.push({
          row: rowNo,
          reason,
          level,
          store: storeRaw,
          year: yearRaw,
          monthOrQuarter: monthRaw || quarterRaw,
          field,
          suggestion: getSuggestion(reason, field)
        });
        rowMsgs.push(reason);
      };
      const scope = storeRaw ? findStoreId(storeRaw) : null;
      if (!storeRaw) addIssue("error", "缺少门店", "门店");
      if (storeRaw && !scope) addIssue("error", "门店名称无法识别", "门店");
      if (!yearRaw) addIssue("error", "年份为空", "年份");
      const year = Number(yearRaw);
      if (yearRaw && !Number.isFinite(year)) addIssue("error", "年份格式异常", "年份");
      if (!monthRaw && !quarterRaw) addIssue("error", "月份 / 季度为空", "月份/季度");
      if (monthRaw && quarterRaw) addIssue("warning", "月份与季度同时存在，默认按月份", "月份/季度");
      if (!scope || !Number.isFinite(year)) {
        rowResults.push({ row: rowNo, status: "失败", store: storeRaw, year: yearRaw, monthOrQuarter: monthRaw || quarterRaw, messages: rowMsgs });
        return;
      }
      const period: ReportPeriod = monthRaw ? { 粒度: "month", 年: year, 月: Number(monthRaw) || 1 } : quarterRaw ? { 粒度: "quarter", 年: year, 季: Number(quarterRaw) || 1 } : { 粒度: "year", 年: year };
      const key = buildActualStorageKey(scope, period);
      const existing = entries[key] ?? existingOverrides[key] ?? {};
      const next: ActualOverrideValues = { ...existing };
      const metricFields = fields.filter((f) => !["门店", "年份", "月份", "季度"].includes(f)) as Array<ActualHotelKey | ActualFinancialKey>;
      metricFields.forEach((f) => {
        const raw = row[mapping[f]];
        if (raw === undefined || raw === null || String(raw).trim() === "") return;
        const num = typeof raw === "number" ? raw : Number(String(raw).trim());
        if (!Number.isFinite(num)) {
          addIssue("error", `${f} 数值不是数字`, f);
          return;
        }
        if (existingOverrides[key]?.[f] !== undefined) overwriteCount += 1;
        next[f] = num;
      });
      entries[key] = next;
      const hasError = issues.some((i) => i.row === rowNo && i.level === "error");
      const hasWarning = issues.some((i) => i.row === rowNo && i.level === "warning");
      rowResults.push({
        row: rowNo,
        status: hasError ? "失败" : hasWarning ? "警告" : "成功",
        store: storeRaw,
        year: yearRaw,
        monthOrQuarter: monthRaw || quarterRaw,
        messages: rowMsgs
      });
    });
    const level = issues.some((i) => i.level === "error") ? "不可导入" : issues.some((i) => i.level === "warning") ? "有警告" : "可导入";
    const stats = {
      成功条数: rowResults.filter((r) => r.status === "成功").length,
      警告条数: rowResults.filter((r) => r.status === "警告").length,
      失败条数: rowResults.filter((r) => r.status === "失败").length
    };
    return { issues, entries, overwriteCount, level, rowResults, stats };
  }, [rows, mapping, existingOverrides, fields]);

  const totalRows = Math.max(parseResult.rowResults.length, 1);
  const pctText = (count: number) => `${((count / totalRows) * 100).toFixed(0)}%`;
  const issueFieldsByRow = useMemo(() => {
    const map: Record<number, Record<string, IssueLevel>> = {};
    parseResult.issues.forEach((i) => {
      if (!map[i.row]) map[i.row] = {};
      const prev = map[i.row]?.[i.field];
      map[i.row]![i.field] = prev === "error" ? "error" : i.level;
    });
    return map;
  }, [parseResult.issues]);

  const jumpToIssue = (issue: IssueWithFix) => {
    const key = `${issue.row}-${issue.field}-${issue.reason}`;
    setFocusedIssueKey(key);
    const fieldMapping = issue.field.includes("月份") ? "月份" : issue.field;
    const mappedColumn = mapping[fieldMapping as FieldKey];
    if (!mappedColumn || fieldMapping === "月份/季度") {
      setMappingExpanded(true);
      const target = mappingRefs.current[fieldMapping] ?? mappingRefs.current["月份"] ?? mappingRefs.current["季度"];
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const rowEl = rowRefs.current[issue.row];
    if (rowEl) rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const getRowStyle = (status: "成功" | "警告" | "失败") =>
    status === "成功"
      ? "bg-emerald-50/70"
      : status === "警告"
        ? "bg-amber-50/70"
        : "bg-red-50/70";

  const getCellStyle = (row: number, field: string) => {
    const level = issueFieldsByRow[row]?.[field];
    if (level === "error") return "border border-red-400 text-red-700";
    if (level === "warning") return "border border-amber-400 text-amber-700";
    return "";
  };

  const filteredRows = useMemo(() => {
    if (resultFilter === "全部") return parseResult.rowResults;
    return parseResult.rowResults.filter((r) => r.status === resultFilter);
  }, [parseResult.rowResults, resultFilter]);

  const downloadTemplate = () => {
    if (!window.XLSX) return;
    if (mode === "hotel") {
      const base = [
        {
          门店: DEMO_EXAMPLE_STORE_DISPLAY,
          年份: 2026,
          月份: 4,
          季度: "",
          可售间夜数: 4200,
          已售间数: 3600,
          出租率: 0.86,
          平均房价: 392,
          RevPAR: 337,
          客房收入: 141
        }
      ];
      const ws = window.XLSX.utils.json_to_sheet(base);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "实际数据");
      window.XLSX.writeFile(wb, "酒店实际数据模板.xlsx");
      return;
    }
    const demoByField: Record<FieldKey, string | number> = {
      门店: DEMO_EXAMPLE_STORE_DISPLAY,
      年份: 2026,
      月份: 4,
      季度: "",
      营业收入: 178,
      客房收入: 132,
      餐饮收入: 25,
      其他收入: 21,
      人力成本: 31,
      能源费用: 8,
      华住管理费: 13,
      客房服务成本: 14,
      非客房服务成本: 11,
      原材料成本: 6,
      营业利润: 95,
      可售间夜数: 0,
      已售间数: 0,
      出租率: 0,
      平均房价: 0,
      RevPAR: 0
    };
    const row = Object.fromEntries(
      financialFields.map((f) => [fieldDisplayLabel(f), demoByField[f]])
    ) as Record<string, string | number>;
    const ws = window.XLSX.utils.json_to_sheet([row]);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "实际数据");
    window.XLSX.writeFile(wb, "财务实际数据模板.xlsx");
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">{mode === "hotel" ? "导入酒店实际经营数据" : "导入财务实际数据"}</CardTitle>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />下载实际数据模板
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm">
            <FileUp className="mr-2 h-4 w-4" />上传 Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f || !window.XLSX) return;
                const wb = window.XLSX.read(await f.arrayBuffer(), { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0] as string];
                const json = window.XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
                setRows(json); setHeaders(json.length ? Object.keys(json[0] as Row) : []); setFileName(f.name);
                autoMap(json.length ? Object.keys(json[0] as Row) : []);
              }}
            />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-md border border-amber-200/90 bg-amber-50/80 px-2.5 py-1.5 text-xs text-amber-950">
          本面板为旧版 Excel 预览与字段映射调试，仅供临时查看；正式经营数据导入请使用「经营数据模板」页。
        </p>
        <p className="text-xs text-muted-foreground">文件：{fileName || "未上传"}{!ready ? "（加载解析引擎中）" : ""}</p>
        {headers.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => setMappingExpanded((p) => !p)}
            >
              {mappingExpanded ? "收起字段映射" : "展开字段映射"}
            </button>
            {mappingExpanded && <div className="grid gap-2 md:grid-cols-3">
            {fields.map((f) => (
              <div key={f} ref={(el) => { mappingRefs.current[f] = el; }}>
                <p className="mb-1 text-xs text-muted-foreground">{fieldDisplayLabel(f)} 列映射</p>
                <Select value={mapping[f] || "__none__"} onValueChange={(v) => setMapping((p) => ({ ...p, [f]: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">未映射</SelectItem>
                    {headers.map((h) => <SelectItem key={`${f}-${h}`} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>}
          </div>
        )}
        {rows.length > 0 && (
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">校验结果：{parseResult.level}</p>
            <div className="mb-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />成功 {parseResult.stats.成功条数} 条（{pctText(parseResult.stats.成功条数)}）</div>
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700"><AlertTriangle className="mr-1 inline h-4 w-4" />警告 {parseResult.stats.警告条数} 条（{pctText(parseResult.stats.警告条数)}）</div>
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"><XCircle className="mr-1 inline h-4 w-4" />失败 {parseResult.stats.失败条数} 条（{pctText(parseResult.stats.失败条数)}）</div>
            </div>
            {parseResult.issues.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />可导入</p>
            ) : (
              <ul className="space-y-1 text-sm text-amber-800">
                {parseResult.issues.slice(0, 12).map((i, idx) => {
                  const key = `${i.row}-${i.field}-${i.reason}`;
                  return (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() => jumpToIssue(i)}
                        className={`flex items-center gap-2 text-left underline-offset-4 hover:underline ${focusedIssueKey === key ? "font-medium" : ""}`}
                      >
                        <AlertCircle className="h-4 w-4" />
                        第{i.row}行：{i.reason}（字段：{i.field}）
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as ResultFilter)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="全部">全部</SelectItem>
                  <SelectItem value="成功">成功</SelectItem>
                  <SelectItem value="警告">警告</SelectItem>
                  <SelectItem value="失败">失败</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const rowsForCsv = parseResult.issues.map((i) => ({
                    原始行号: i.row,
                    门店: i.store,
                    年份: i.year,
                    "月份/季度": i.monthOrQuarter,
                    字段: i.field,
                    错误原因: i.reason
                  }));
                  const header = ["原始行号", "门店", "年份", "月份/季度", "字段", "错误原因"];
                  const lines = [header.join(",")].concat(
                    rowsForCsv.map((r) =>
                      header.map((h) => `"${String(r[h as keyof typeof r] ?? "").replace(/"/g, '""')}"`).join(",")
                    )
                  );
                  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${mode === "hotel" ? "酒店实际导入错误报告" : "财务实际导入错误报告"}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                下载错误报告 CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!window.XLSX) return;
                  const rowsForExcel = parseResult.issues.map((i) => ({
                    原始行号: i.row,
                    级别: i.level === "error" ? "错误" : "警告",
                    门店: i.store,
                    年份: i.year,
                    "月份/季度": i.monthOrQuarter,
                    字段: i.field,
                    错误原因: i.reason,
                    建议修复方式: i.suggestion
                  }));
                  const ws = window.XLSX.utils.json_to_sheet(rowsForExcel) as Record<
                    string,
                    { s?: Record<string, unknown> }
                  >;
                  const wb = window.XLSX.utils.book_new();
                  window.XLSX.utils.book_append_sheet(wb, ws, "错误明细");
                  rowsForExcel.forEach((r, idx) => {
                    const row = idx + 2;
                    const levelCell = ws[`B${row}`] as { s?: Record<string, unknown> } | undefined;
                    if (levelCell) {
                      levelCell.s = r.级别 === "错误"
                        ? { fill: { fgColor: { rgb: "FEE2E2" } }, font: { color: { rgb: "B91C1C" }, bold: true } }
                        : { fill: { fgColor: { rgb: "FEF3C7" } }, font: { color: { rgb: "B45309" }, bold: true } };
                    }
                  });
                  window.XLSX.writeFile(wb, `${mode === "hotel" ? "酒店实际导入错误报告" : "财务实际导入错误报告"}.xlsx`);
                }}
              >
                下载错误报告 Excel
              </Button>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={importSuccessOnly} onChange={(e) => setImportSuccessOnly(e.target.checked)} />
                仅导入成功行
              </label>
            </div>
            {filteredRows.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>行号</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>门店</TableHead>
                      <TableHead>年份</TableHead>
                      <TableHead>月份/季度</TableHead>
                      <TableHead>说明</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.slice(0, 20).map((r) => (
                      <TableRow key={`rr-${r.row}`} className={getRowStyle(r.status)} ref={(el) => { rowRefs.current[r.row] = el; }}>
                        <TableCell>{r.row}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell className={getCellStyle(r.row, "门店")}>{r.store}</TableCell>
                        <TableCell className={getCellStyle(r.row, "年份")}>{r.year}</TableCell>
                        <TableCell className={getCellStyle(r.row, "月份/季度")}>{r.monthOrQuarter}</TableCell>
                        <TableCell className="text-muted-foreground">{r.messages.join("；") || "通过"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {parseResult.overwriteCount > 0 && <p className="mt-2 text-sm text-amber-700">将覆盖已有实际数据 {parseResult.overwriteCount} 项。</p>}
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                disabled={parseResult.level === "不可导入"}
                onClick={() => {
                  if (parseResult.overwriteCount > 0 && !window.confirm("将覆盖已有实际数据，是否继续？")) return;
                  if (!importSuccessOnly) {
                    onImport(parseResult.entries);
                    return;
                  }
                  const failedRows = new Set(parseResult.rowResults.filter((r) => r.status !== "成功").map((r) => r.row));
                  const picked: ActualOverrideMap = {};
                  rows.forEach((row, idx) => {
                    const rowNo = idx + 2;
                    if (failedRows.has(rowNo)) return;
                    const storeRaw = String(row[mapping["门店"]] ?? "").trim();
                    const year = Number(String(row[mapping["年份"]] ?? "").trim());
                    const monthRaw = String(row[mapping["月份"]] ?? "").trim();
                    const quarterRaw = String(row[mapping["季度"]] ?? "").trim();
                    const scope = findStoreId(storeRaw);
                    if (!scope || !Number.isFinite(year)) return;
                    const period: ReportPeriod = monthRaw
                      ? { 粒度: "month", 年: year, 月: Number(monthRaw) || 1 }
                      : quarterRaw
                        ? { 粒度: "quarter", 年: year, 季: Number(quarterRaw) || 1 }
                        : { 粒度: "year", 年: year };
                    const key = buildActualStorageKey(scope, period);
                    const next: ActualOverrideValues = { ...(picked[key] ?? existingOverrides[key] ?? {}) };
                    const metricFields = fields.filter((f) => !["门店", "年份", "月份", "季度"].includes(f)) as Array<ActualHotelKey | ActualFinancialKey>;
                    metricFields.forEach((f) => {
                      const raw = row[mapping[f]];
                      if (raw === undefined || raw === null || String(raw).trim() === "") return;
                      const num = typeof raw === "number" ? raw : Number(String(raw).trim());
                      if (!Number.isFinite(num)) return;
                      next[f] = num;
                    });
                    picked[key] = next;
                  });
                  onImport(picked);
                }}
              >确认导入</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
