/**
 * 门店开业账期（month → period_value 如 2026-01）
 * 优先匹配 Supabase store_id；其次 mock id；最后门店显示名/简称
 */

import { 门店主数据 } from "@/lib/store-master";

/** 门店显示名 / 常用简称 → 开业账期 YYYY-MM */
export const STORE_OPENING_PERIOD_BY_LABEL: Record<string, string> = {
  "沐家-全季槐安西": "2026-01",
  "沐家｜全季槐安西｜石家庄": "2026-01",
  "泽桐-星程中山西": "2026-01",
  "泽桐｜星程中山西｜石家庄": "2026-01",
  "雨航-全季中山西": "2026-03",
  "雨航｜全季中山西｜石家庄": "2026-03",
  "今源-绥德": "2026-04",
  "今源｜绥德": "2026-04"
};

/** mock 门店 id → 开业账期 */
export const STORE_OPENING_PERIOD_BY_MOCK_ID: Record<string, string> = {
  "hotel-mujia-quanji-huaianxi": "2026-01",
  "hotel-zetong-xingcheng-zhongshanxi": "2026-01",
  "hotel-yuhang-quanji-zhongshanxi": "2026-03",
  "hotel-jinyuan-suide": "2026-04"
};

/** Supabase UUID → 开业账期（部署后可按库内 stores.id 补充） */
export const STORE_OPENING_PERIOD_BY_STORE_ID: Record<string, string> = {
  "9e0e7d83-5924-4936-8fd6-9f2b03bf2b7c": "2026-01",
  "6854fde3-b180-412a-a361-451dc322296a": "2026-01",
  "5cd0f9a8-c6df-4364-b6c6-31ecee8d9667": "2026-03",
  "fc23db16-179a-44aa-b184-304534c07a8b": "2026-04"
};

function canonLabel(s: string): string {
  return s.replace(/\s/g, "").replace(/[｜·|]/g, "-").toLowerCase();
}

export function resolveStoreOpeningPeriod(
  storeId?: string | null,
  storeName?: string | null
): string | null {
  if (storeId && STORE_OPENING_PERIOD_BY_STORE_ID[storeId]) {
    return STORE_OPENING_PERIOD_BY_STORE_ID[storeId]!;
  }
  if (storeId && STORE_OPENING_PERIOD_BY_MOCK_ID[storeId]) {
    return STORE_OPENING_PERIOD_BY_MOCK_ID[storeId]!;
  }

  const mock = 门店主数据.find((s) => s.id === storeId);
  if (mock && STORE_OPENING_PERIOD_BY_MOCK_ID[mock.id]) {
    return STORE_OPENING_PERIOD_BY_MOCK_ID[mock.id]!;
  }

  for (const label of [storeName, mock?.显示名称, mock?.门店名称]) {
    if (!label) continue;
    if (STORE_OPENING_PERIOD_BY_LABEL[label]) return STORE_OPENING_PERIOD_BY_LABEL[label];
    const c = canonLabel(label);
    for (const [k, v] of Object.entries(STORE_OPENING_PERIOD_BY_LABEL)) {
      if (canonLabel(k) === c) return v;
    }
  }

  if (storeName) {
    for (const [k, v] of Object.entries(STORE_OPENING_PERIOD_BY_LABEL)) {
      if (storeName.includes(k) || k.includes(storeName)) return v;
    }
  }

  return null;
}

/** 未配置开业时间时：不限制起点（兼容旧数据） */
export function resolveStoreOpeningPeriodOrEarliest(
  storeId?: string | null,
  storeName?: string | null
): string {
  return resolveStoreOpeningPeriod(storeId, storeName) ?? "1970-01";
}
