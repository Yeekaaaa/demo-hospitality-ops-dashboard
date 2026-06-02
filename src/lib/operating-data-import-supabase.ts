/**
 * 经营数据导入 Supabase（actual_data upsert）
 *
 * 【防误用】经营 Excel 只允许写 actual_data，不得写 budget_data。
 * 口径冻结：docs/data-caliber-freeze.md
 */

import type { OperatingDataPreviewRow } from "@/lib/operating-data-import-parse";
import { OPERATING_DATA_ASSET_IMPORT_COLUMNS } from "@/lib/operating-data-asset-field-meta";
import {
  filterActiveStores,
  isOutOfActiveScopeStoreName,
  OUT_OF_ACTIVE_SCOPE_IMPORT_MESSAGE
} from "@/lib/active-store-scope";
import { 门店主数据 } from "@/lib/store-master";
import { getSupabaseClient, formatStoreOptionLabel, type StoreListItem } from "@/src/lib/supabase";

export type OperatingDataImportRowResult = {
  previewIndex: number;
  门店: string;
  ok: boolean;
  message?: string;
};

export type OperatingDataImportSummary = {
  successCount: number;
  failCount: number;
  rowResults: OperatingDataImportRowResult[];
};

/** 与数据库唯一索引 `actual_data_store_period_uidx`（store_id, period_type, period_value）对齐，供 PostgREST upsert */
export const ACTUAL_DATA_UPSERT_ON_CONFLICT = "store_id,period_type,period_value" as const;

function canon(s: string): string {
  return s.replace(/\s/g, "").replace(/[｜·|]/g, "").toLowerCase();
}

function parseAmount(s: string): number | null {
  if (s === "" || s === "—") return null;
  const n = Number(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function normalizePeriodType(raw: string): "month" | "quarter" | "year" | null {
  const x = raw.trim().toLowerCase();
  if (x === "month" || x === "quarter" || x === "year") return x;
  return null;
}

/** 与驾驶舱 period_value 编码一致（季度 Q 大写） */
export function normalizePeriodValueForDb(type: "month" | "quarter" | "year", period: string): string {
  const p = period.trim();
  if (type === "quarter") {
    const m = p.match(/^(\d{4})-q([1-4])$/i);
    if (m) return `${m[1]}-Q${m[2]}`;
  }
  return p;
}

/**
 * 将 Excel「门店」列解析为 `stores.id`：支持 UUID、与 `name` / 下拉展示文案一致、或与模板示例「显示名称」可关联的名称。
 */
export function resolveStoreIdByName(input: string, stores: StoreListItem[]): { id: string } | { error: string } {
  const t = input.trim();
  if (!t || t === "—") return { error: "门店为空" };

  const byId = stores.find((s) => s.id === t);
  if (byId) return { id: byId.id };

  const byName = stores.find((s) => s.name.trim() === t);
  if (byName) return { id: byName.id };

  const byLabel = stores.find((s) => formatStoreOptionLabel(s) === t);
  if (byLabel) return { id: byLabel.id };

  const ct = canon(t);
  const byCanon = stores.find(
    (s) => canon(formatStoreOptionLabel(s)) === ct || canon(s.name) === ct
  );
  if (byCanon) return { id: byCanon.id };

  const mock = 门店主数据.find((m) => m.显示名称 === t || canon(m.显示名称) === ct);
  if (mock) {
    const byMockName = stores.find(
      (s) => s.name.trim() === mock.门店名称 || canon(s.name) === canon(mock.门店名称)
    );
    if (byMockName) return { id: byMockName.id };
    const fuzzy = stores.find(
      (s) => s.name.includes(mock.门店名称) || mock.门店名称.includes(s.name) || s.name.includes(mock.品牌)
    );
    if (fuzzy) return { id: fuzzy.id };
  }

  return {
    error: `未找到门店「${t}」对应的系统档案，请填写与「门店管理 / 顶部门店下拉」一致的名称，或直接填写 stores.id（UUID）。`
  };
}

type ActualDataUpsertPayload = Record<string, unknown>;

function assetPayloadSlice(row: OperatingDataPreviewRow): Record<string, number> {
  const slice: Record<string, number> = {};
  for (const col of OPERATING_DATA_ASSET_IMPORT_COLUMNS) {
    const v = row.assetValues[col.dbKey as keyof typeof row.assetValues];
    if (typeof v === "number" && Number.isFinite(v)) {
      slice[col.dbKey] = v;
    }
  }
  return slice;
}

function buildPayload(row: OperatingDataPreviewRow, storeId: string): ActualDataUpsertPayload | { error: string } {
  const pt = normalizePeriodType(row.账期类型);
  if (!pt) return { error: "账期类型无效" };

  const pv = normalizePeriodValueForDb(pt, row.账期);
  const revenue = parseAmount(row.营业收入);
  if (revenue == null) return { error: "营业收入无效" };

  const totalCost = parseAmount(row.总成本);
  let profit = parseAmount(row.利润);
  if (profit == null && totalCost != null) {
    profit = revenue - totalCost;
  }

  const roomsAvailable = parseAmount(row.可售房晚) ?? 0;
  const roomsSold = parseAmount(row.已售房晚) ?? 0;
  const roomRevenue = parseAmount(row.客房收入) ?? 0;

  return {
    store_id: storeId,
    period_type: pt,
    period_value: pv,
    revenue,
    total_cost: totalCost,
    profit,
    rooms_available: roomsAvailable,
    rooms_sold: roomsSold,
    room_revenue: roomRevenue,
    ...assetPayloadSlice(row)
  };
}

/**
 * 将已通过前端校验的预览行写入 `actual_data`（禁止写入 budget_data）。
 * 依赖唯一索引 (store_id, period_type, period_value)，单行 upsert。
 * @see docs/data-caliber-freeze.md
 */
export async function importOperatingDataToSupabase(
  rows: OperatingDataPreviewRow[],
  stores: StoreListItem[]
): Promise<OperatingDataImportSummary> {
  const rowResults: OperatingDataImportRowResult[] = [];
  let successCount = 0;
  let failCount = 0;

  const client = getSupabaseClient();
  const activeStores = filterActiveStores(stores);

  for (const row of rows) {
    if (row.errors.length > 0) {
      rowResults.push({
        previewIndex: row.previewIndex,
        门店: row.门店,
        ok: false,
        message: `校验未通过：${row.errors.join("；")}`
      });
      failCount += 1;
      continue;
    }

    if (isOutOfActiveScopeStoreName(row.门店)) {
      rowResults.push({
        previewIndex: row.previewIndex,
        门店: row.门店,
        ok: false,
        message: OUT_OF_ACTIVE_SCOPE_IMPORT_MESSAGE
      });
      continue;
    }

    const storeRes = resolveStoreIdByName(row.门店, activeStores);
    if ("error" in storeRes) {
      rowResults.push({
        previewIndex: row.previewIndex,
        门店: row.门店,
        ok: false,
        message: storeRes.error
      });
      failCount += 1;
      continue;
    }

    const payloadBuilt = buildPayload(row, storeRes.id);
    if ("error" in payloadBuilt) {
      rowResults.push({
        previewIndex: row.previewIndex,
        门店: row.门店,
        ok: false,
        message: (payloadBuilt as { error: string }).error
      });
      failCount += 1;
      continue;
    }

    const payload = payloadBuilt;

    const { error: upsertErr } = await client.from("actual_data").upsert(payload, {
      onConflict: ACTUAL_DATA_UPSERT_ON_CONFLICT
    });

    if (upsertErr) {
      rowResults.push({
        previewIndex: row.previewIndex,
        门店: row.门店,
        ok: false,
        message: `Upsert 失败：${upsertErr.message}${upsertErr.details ? `（${upsertErr.details}）` : ""}${upsertErr.hint ? ` 提示：${upsertErr.hint}` : ""}`
      });
      failCount += 1;
      continue;
    }

    rowResults.push({
      previewIndex: row.previewIndex,
      门店: row.门店,
      ok: true,
      message: "已写入 actual_data（唯一键冲突时已合并更新；不含预算字段）"
    });
    successCount += 1;
  }

  return { successCount, failCount, rowResults };
}
