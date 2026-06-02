/**
 * 浏览器/服务端共用的 active store UUID 缓存（供 actual_data 查询解析「全部门店」）
 */

import { getActiveStoreIdsFromList } from "@/lib/active-store-scope";
import { getStoresIncludeAllRaw } from "@/src/lib/supabase";
import { 全部门店值 } from "@/lib/store-master";

export type ActualDataStoreScope = typeof 全部门店值 | string | readonly string[];

let cachedIds: string[] | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

export async function fetchActiveStoreIds(): Promise<string[]> {
  if (cachedIds && Date.now() - cacheAt < CACHE_TTL_MS) {
    return cachedIds;
  }
  try {
    const raw = await getStoresIncludeAllRaw();
    cachedIds = getActiveStoreIdsFromList(raw);
  } catch {
    cachedIds = [];
  }
  cacheAt = Date.now();
  return cachedIds ?? [];
}

export function primeActiveStoreIds(ids: readonly string[]): void {
  cachedIds = [...ids];
  cacheAt = Date.now();
}

/** 将 UI 的 actual_data scope 解析为可查询的 UUID 列表或单店 */
export async function resolveActualDataStoreScope(
  storeScope: ActualDataStoreScope
): Promise<string | readonly string[]> {
  const activeIds = await fetchActiveStoreIds();

  if (storeScope === 全部门店值) {
    return activeIds.length ? activeIds : [];
  }
  if (typeof storeScope === "string") {
    return activeIds.includes(storeScope) ? storeScope : [];
  }
  const filtered = storeScope.filter((id) => activeIds.includes(id));
  return filtered.length ? filtered : [];
}
