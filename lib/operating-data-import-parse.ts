/**
 * 经营数据 Excel 解析与校验（仅前端，不入库）
 */

import {
  OPERATING_DATA_IMPORT_SHEET_NAME,
  OPERATING_DATA_FULL_IMPORT_HEADERS
} from "@/lib/operating-data-import-template";
import {
  OPERATING_DATA_ASSET_IMPORT_COLUMNS,
  type AssetImportColumnMeta
} from "@/lib/operating-data-asset-field-meta";
import { parseOptionalCount, parseRatioOrPercentToDecimal } from "@/lib/operating-data-ratio-parse";

type XlsxModule = typeof import("xlsx");

export type OperatingDataAssetParsedValues = Partial<
  Record<(typeof OPERATING_DATA_ASSET_IMPORT_COLUMNS)[number]["dbKey"], number | null>
>;

export type OperatingDataPreviewRow = {
  /** 预览中的序号（自上而下、不含表头与已跳过的空行） */
  previewIndex: number;
  门店: string;
  账期类型: string;
  账期: string;
  营业收入: string;
  总成本: string;
  利润: string;
  可售房晚: string;
  已售房晚: string;
  客房收入: string;
  /** 扩展字段：已解析数值，null 表示空不写库 */
  assetValues: OperatingDataAssetParsedValues;
  errors: string[];
};

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

function isRowBlank(r: Record<string, unknown>): boolean {
  return OPERATING_DATA_FULL_IMPORT_HEADERS.every((h) => cellStr(r[h]) === "");
}

function validateAssetColumns(
  raw: Record<string, unknown>,
  errors: string[]
): OperatingDataAssetParsedValues {
  const out: OperatingDataAssetParsedValues = {};
  for (const col of OPERATING_DATA_ASSET_IMPORT_COLUMNS as readonly AssetImportColumnMeta[]) {
    const cell = cellStr(raw[col.headerZh]);
    if (cell === "") {
      continue;
    }
    if (col.kind === "yuan" || col.kind === "wan") {
      const n = parseOptionalNumber(cell, col.headerZh);
      if (!n.ok) errors.push(n.error);
      else if (n.value !== "") {
        const v = Number(n.value);
        out[col.dbKey as keyof OperatingDataAssetParsedValues] = Number.isFinite(v) ? v : null;
      }
      continue;
    }
    if (col.kind === "count" || col.kind === "integer") {
      const c = parseOptionalCount(cell, col.headerZh);
      if (!c.ok) errors.push(c.error);
      else if (c.value !== null) out[col.dbKey as keyof OperatingDataAssetParsedValues] = c.value;
      continue;
    }
    const r = parseRatioOrPercentToDecimal(cell, col.headerZh);
    if (!r.ok) errors.push(r.error);
    else if (r.value != null) out[col.dbKey as keyof OperatingDataAssetParsedValues] = r.value;
  }
  return out;
}

function parseOptionalNumber(raw: string, label: string): { ok: true; value: string } | { ok: false; error: string } {
  if (raw === "") return { ok: true, value: "" };
  const normalized = raw.replace(/,/g, "").trim();
  const n = Number(normalized);
  if (!Number.isFinite(n)) return { ok: false, error: `${label}须为数字` };
  return { ok: true, value: normalized };
}

function validatePeriodValue(type: string, period: string): string | null {
  const t = type.toLowerCase();
  const p = period.trim();
  if (t === "month") {
    const m = p.match(/^(\d{4})-(\d{2})$/);
    if (!m) return "账期格式应为 YYYY-MM（如 2026-04）";
    const mo = Number(m[2]);
    if (mo < 1 || mo > 12) return "月份须在 01–12 之间";
    return null;
  }
  if (t === "quarter") {
    if (!/^\d{4}-Q[1-4]$/i.test(p)) return "账期格式应为 YYYY-Q1～Q4（如 2026-Q2）";
    return null;
  }
  if (t === "year") {
    if (!/^\d{4}$/.test(p)) return "账期格式应为四位年份（如 2026）";
    return null;
  }
  return null;
}

export type ParseOperatingDataResult =
  | { ok: true; rows: OperatingDataPreviewRow[] }
  | { ok: false; error: string };

/**
 * 从已读取的 Workbook 解析「数据模板」sheet，逐行校验。
 */
export function parseOperatingDataWorkbook(wb: import("xlsx").WorkBook, XLSX: XlsxModule): ParseOperatingDataResult {
  const ws = wb.Sheets[OPERATING_DATA_IMPORT_SHEET_NAME];
  if (!ws) {
    return {
      ok: false,
      error: `未找到工作表「${OPERATING_DATA_IMPORT_SHEET_NAME}」。请使用本站下载的模板，或手动将数据表重命名为该名称。`
    };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false
  });

  const out: OperatingDataPreviewRow[] = [];

  for (const raw of rawRows) {
    if (isRowBlank(raw)) {
      continue;
    }

    const 门店 = cellStr(raw["门店"]);
    const 账期类型 = cellStr(raw["账期类型"]);
    const 账期 = cellStr(raw["账期"]);
    const 营业收入原 = cellStr(raw["营业收入"]);
    const 总成本原 = cellStr(raw["总成本"]);
    const 利润原 = cellStr(raw["利润"]);
    const 可售原 = cellStr(raw["可售房晚"]);
    const 已售原 = cellStr(raw["已售房晚"]);
    const 客房原 = cellStr(raw["客房收入"]);

    const errors: string[] = [];

    if (门店 === "") errors.push("门店为必填");

    const typeLower = 账期类型.toLowerCase();
    if (账期类型 === "") {
      errors.push("账期类型为必填");
    } else if (!["month", "quarter", "year"].includes(typeLower)) {
      errors.push("账期类型须为 month、quarter 或 year（小写）");
    }

    if (账期 === "") {
      errors.push("账期为必填");
    } else if (["month", "quarter", "year"].includes(typeLower)) {
      const pe = validatePeriodValue(typeLower, 账期);
      if (pe) errors.push(pe);
    }

    if (营业收入原 === "") {
      errors.push("营业收入为必填");
    } else {
      const rev = parseOptionalNumber(营业收入原, "营业收入");
      if (!rev.ok) errors.push(rev.error);
    }

    const 总成本 = 总成本原 === "" ? "" : 总成本原;
    if (总成本 !== "") {
      const c = parseOptionalNumber(总成本, "总成本");
      if (!c.ok) errors.push(c.error);
    }

    if (利润原 !== "") {
      const p = parseOptionalNumber(利润原, "利润");
      if (!p.ok) errors.push(p.error);
    }

    if (可售原 !== "") {
      const a = parseOptionalNumber(可售原, "可售房晚");
      if (!a.ok) errors.push(a.error);
    }

    if (已售原 !== "") {
      const s = parseOptionalNumber(已售原, "已售房晚");
      if (!s.ok) errors.push(s.error);
    }

    if (客房原 !== "") {
      const rr = parseOptionalNumber(客房原, "客房收入");
      if (!rr.ok) errors.push(rr.error);
    }

    const assetValues = validateAssetColumns(raw, errors);

    out.push({
      previewIndex: out.length + 1,
      门店: 门店 || "—",
      账期类型: 账期类型 || "—",
      账期: 账期 || "—",
      营业收入: 营业收入原 || "—",
      总成本: 总成本原,
      利润: 利润原,
      可售房晚: 可售原,
      已售房晚: 已售原,
      客房收入: 客房原,
      assetValues,
      errors
    });
  }

  return { ok: true, rows: out };
}

export function readOperatingDataWorkbook(buffer: ArrayBuffer, XLSX: XlsxModule): import("xlsx").WorkBook {
  return XLSX.read(buffer, { type: "array" });
}
