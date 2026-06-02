/**
 * 预算 Excel 解析与校验
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import {
  isOutOfActiveScopeStoreName,
  OUT_OF_ACTIVE_SCOPE_IMPORT_MESSAGE,
  filterActiveMockStores
} from "@/lib/active-store-scope";
import { buildBudgetStorageKey, type BudgetOverrideMap, type BudgetSubjectValueMap } from "@/lib/budget-overrides";
import { BUDGET_IMPORT_SHEET_NAME } from "@/lib/budget-import-template";
import { normalizeBudgetVersion, type BudgetVersionValue } from "@/lib/budget-versions";
import { resolveBudgetSubjectLabel } from "@/lib/budget-subjects";
import { 全部门店值 } from "@/lib/store-master";

type XlsxModule = typeof import("xlsx");

export type BudgetImportRowError = { rowIndex: number; message: string };

export type ParsedBudgetImportItem = {
  scope: string;
  period: ReportPeriod;
  budgetVersion: BudgetVersionValue;
  subject: string;
  value: number;
  unit: string;
  remark: string;
};

export type ParseBudgetImportResult =
  | {
      ok: true;
      items: ParsedBudgetImportItem[];
      nextEntries: BudgetOverrideMap;
      warnings: BudgetImportRowError[];
    }
  | { ok: false; error: string };

const REQUIRED_HEADERS = ["门店", "年份", "月份", "科目", "预算值"] as const;

function normalize(s: string): string {
  return s.replace(/\s/g, "").replace(/[｜|]/g, "").trim();
}

function findStoreId(nameRaw: string): string | null {
  if (isOutOfActiveScopeStoreName(nameRaw)) return null;
  const v = normalize(nameRaw);
  if (!v || v === normalize("全部门店")) return 全部门店值;
  const pool = filterActiveMockStores();
  const exact = pool.find(
    (s) => normalize(s.显示名称) === v || normalize(`${s.品牌}-${s.门店名称}`) === v || normalize(s.门店名称) === v
  );
  if (exact) return exact.id;
  const fuzzy = pool.find(
    (s) => v.includes(normalize(s.门店名称)) || normalize(`${s.品牌}-${s.门店名称}`).includes(v)
  );
  return fuzzy?.id ?? null;
}

function validateHeaders(headers: string[]): string | null {
  const normalized = headers.map((h) => normalize(h));
  for (const req of REQUIRED_HEADERS) {
    if (!normalized.some((h) => h === normalize(req))) {
      return `缺少必填列「${req}」。请使用本站下载的预算模板，或对照「字段说明」sheet 补全表头。`;
    }
  }
  return null;
}

function headerKey(headers: string[], name: string): string {
  const n = normalize(name);
  return headers.find((h) => normalize(h) === n) ?? name;
}

function parseQuarter(raw: string): number | null {
  const t = raw.trim().toUpperCase();
  const m = t.match(/^Q([1-4])$/);
  if (!m) return null;
  return Number(m[1]);
}

export function parseBudgetWorkbook(
  wb: import("xlsx").WorkBook,
  XLSX: XlsxModule,
  existingOverrides: BudgetOverrideMap
): ParseBudgetImportResult {
  const sheetName =
    wb.SheetNames.find((n) => n === BUDGET_IMPORT_SHEET_NAME) ?? wb.SheetNames[0];
  if (!sheetName) {
    return { ok: false, error: "工作簿为空，无法解析。" };
  }

  const ws = wb.Sheets[sheetName];
  if (!ws) {
    return { ok: false, error: `未找到工作表「${BUDGET_IMPORT_SHEET_NAME}」。请使用本站下载的预算模板。` };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (!rawRows.length) {
    return { ok: false, error: "预算模板中无数据行。" };
  }

  const headers = Object.keys(rawRows[0] ?? {});
  const headerErr = validateHeaders(headers);
  if (headerErr) return { ok: false, error: headerErr };

  const col = {
    门店: headerKey(headers, "门店"),
    年份: headerKey(headers, "年份"),
    月份: headerKey(headers, "月份"),
    季度: headerKey(headers, "季度"),
    预算版本: headerKey(headers, "预算版本"),
    科目: headerKey(headers, "科目"),
    预算值: headerKey(headers, "预算值"),
    单位: headerKey(headers, "单位"),
    备注: headerKey(headers, "备注")
  };

  const errors: BudgetImportRowError[] = [];
  const warnings: BudgetImportRowError[] = [];
  const parsed: ParsedBudgetImportItem[] = [];

  rawRows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const storeRaw = String(row[col.门店] ?? "").trim();
    const yearRaw = String(row[col.年份] ?? "").trim();
    const monthRaw = String(row[col.月份] ?? "").trim();
    const quarterRaw = String(row[col.季度] ?? "").trim();
    const versionRaw = String(row[col.预算版本] ?? "").trim();
    const subjectRaw = String(row[col.科目] ?? "").trim();
    const amountRaw = row[col.预算值];
    const unitRaw = String(row[col.单位] ?? "").trim();
    const remarkRaw = String(row[col.备注] ?? "").trim();

    const allBlank =
      !storeRaw && !yearRaw && !monthRaw && !quarterRaw && !subjectRaw && String(amountRaw ?? "").trim() === "";
    if (allBlank) return;

    if (!storeRaw) {
      errors.push({ rowIndex: rowNo, message: "门店为必填" });
      return;
    }
    if (isOutOfActiveScopeStoreName(storeRaw)) {
      warnings.push({ rowIndex: rowNo, message: OUT_OF_ACTIVE_SCOPE_IMPORT_MESSAGE });
      return;
    }
    const scope = findStoreId(storeRaw);
    if (!scope) {
      errors.push({ rowIndex: rowNo, message: `门店「${storeRaw}」无法匹配当前经营门店范围` });
      return;
    }

    const budgetVersion = normalizeBudgetVersion(versionRaw || undefined);

    if (!yearRaw) {
      errors.push({ rowIndex: rowNo, message: "年份为必填" });
      return;
    }
    if (!/^\d{4}$/.test(yearRaw)) {
      errors.push({ rowIndex: rowNo, message: "年份须为四位数字，如 2026" });
      return;
    }
    const year = Number(yearRaw);

    if (!monthRaw && !quarterRaw) {
      errors.push({ rowIndex: rowNo, message: "月份或季度至少填写一项" });
      return;
    }
    if (monthRaw && quarterRaw) {
      warnings.push({ rowIndex: rowNo, message: "同时填写月份与季度，将按月份导入" });
    }

    let monthNum: number | undefined;
    if (monthRaw) {
      monthNum = Number(monthRaw);
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        errors.push({ rowIndex: rowNo, message: "月份须为 1–12 的整数" });
        return;
      }
    }

    if (quarterRaw) {
      const q = parseQuarter(quarterRaw);
      if (q == null) {
        errors.push({ rowIndex: rowNo, message: "季度只能填写 Q1、Q2、Q3、Q4" });
        return;
      }
    }

    if (!subjectRaw) {
      errors.push({ rowIndex: rowNo, message: "科目为必填" });
      return;
    }
    const subject = resolveBudgetSubjectLabel(subjectRaw);
    if (!subject) {
      errors.push({
        rowIndex: rowNo,
        message: `科目「${subjectRaw}」不在标准预算科目清单中，请检查字段说明 sheet。`
      });
      return;
    }

    const amount =
      typeof amountRaw === "number" ? amountRaw : Number(String(amountRaw ?? "").replace(/,/g, "").trim());
    if (!Number.isFinite(amount)) {
      errors.push({ rowIndex: rowNo, message: "预算值须为数字" });
      return;
    }

    const period: ReportPeriod = monthRaw
      ? { 粒度: "month", 年: year, 月: monthNum ?? 1 }
      : { 粒度: "quarter", 年: year, 季: parseQuarter(quarterRaw)! };

    parsed.push({
      scope,
      period,
      budgetVersion,
      subject,
      value: amount,
      unit: unitRaw,
      remark: remarkRaw
    });
  });

  if (errors.length) {
    const first = errors[0]!;
    return {
      ok: false,
      error: `第 ${first.rowIndex} 行：${first.message}${errors.length > 1 ? `（另有 ${errors.length - 1} 处错误）` : ""}`
    };
  }

  if (!parsed.length) {
    return { ok: false, error: "未解析到有效预算行，请检查是否为空表。" };
  }

  const nextEntries: BudgetOverrideMap = { ...existingOverrides };
  for (const p of parsed) {
    const key = buildBudgetStorageKey(p.scope, p.period, p.budgetVersion);
    const prev: BudgetSubjectValueMap = { ...(nextEntries[key] ?? {}) };
    prev[p.subject] = p.value;
    nextEntries[key] = prev;
  }

  return { ok: true, items: parsed, nextEntries, warnings };
}

export function readBudgetWorkbook(buffer: ArrayBuffer, XLSX: XlsxModule): import("xlsx").WorkBook {
  return XLSX.read(buffer, { type: "array" });
}
