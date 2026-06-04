/**
 * 门店开业账期（month → period_value 如 2026-01）
 * 优先匹配 mock id；其次门店显示名/简称。Supabase UUID 请在部署环境本地配置，勿写入公开仓库。
 */

import { 门店主数据 } from "@/lib/store-master";

/** 门店显示名 / 常用简称 → 开业账期 YYYY-MM */
export const STORE_OPENING_PERIOD_BY_LABEL: Record<string, string> = {
  "示例酒店 A-核心店": "2026-01",
  "示例酒店 A｜核心店｜示例城市": "2026-01",
  "示例酒店 B-商务店": "2026-01",
  "示例酒店 B｜商务店｜示例城市": "2026-01",
  "示例酒店 C-新店": "2026-03",
  "示例酒店 C｜新店｜示例城市": "2026-03",
  "示例停业店": "2026-04",
  "示例酒店 D｜停业店": "2026-04"
};

/** mock 门店 id → 开业账期 */
export const STORE_OPENING_PERIOD_BY_MOCK_ID: Record<string, string> = {
  "hotel-mujia-quanji-huaianxi": "2026-01",
  "hotel-zetong-xingcheng-zhongshanxi": "2026-01",
  "hotel-yuhang-quanji-zhongshanxi": "2026-03",
  "hotel-jinyuan-suide": "2026-04"
};

/**
 * Supabase store UUID → 开业账期（仅本地/私有部署配置，公开仓库保持为空）
 * 示例：STORE_OPENING_PERIOD_BY_STORE_ID["<your-store-uuid>"] = "2026-01"
 */
export const STORE_OPENING_PERIOD_BY_STORE_ID: Record<string, string> = {};

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
