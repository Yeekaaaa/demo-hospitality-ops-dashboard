/**
 * 当前经营管理后台的默认可用门店范围（不含面馆、今源-绥德等）
 * 不删除 Supabase 数据，仅在前台筛选、聚合与展示时排除。
 */

import type { StoreListItem } from "@/src/lib/supabase";
import { formatStoreOptionLabel } from "@/src/lib/supabase";
import { 全部门店值, 门店主数据, type StoreMaster } from "@/lib/store-master";

export const ACTIVE_STORE_EXCLUDED_KEYWORDS = ["面馆", "今源", "绥德"] as const;

export const ACTIVE_STORE_INCLUDED_KEYWORDS = ["沐家", "泽桐", "雨航", "西北赋"] as const;

const HOTEL_KEYWORDS = ["沐家", "泽桐", "雨航"] as const;
const RESTAURANT_KEYWORDS = ["西北赋"] as const;

/** 顶栏 / 筛选卡片展示用 */
export const ACTIVE_STORE_SCOPE_SHORT_LABEL = "石家庄经营门店";

export const ACTIVE_STORE_SCOPE_DETAIL_LABEL = "沐家、泽桐、雨航、西北赋";

export type ActiveStoreLike = {
  id?: string;
  name?: string;
  brand?: string;
  city?: string;
  label?: string;
  displayName?: string;
};

function storeSearchText(store: ActiveStoreLike): string {
  return [store.name, store.brand, store.city, store.label, store.displayName]
    .filter(Boolean)
    .join(" ");
}

/** 名称/展示文案是否命中排除关键词 */
export function isExcludedStore(store: ActiveStoreLike): boolean {
  return isExcludedFromActiveScope(store);
}

/** @deprecated 使用 isExcludedStore */
export function isExcludedFromActiveScope(store: ActiveStoreLike): boolean {
  const text = storeSearchText(store);
  if (!text) return false;
  return ACTIVE_STORE_EXCLUDED_KEYWORDS.some((k) => text.includes(k));
}

function matchesIncludedKeyword(store: ActiveStoreLike): boolean {
  const text = storeSearchText(store);
  return ACTIVE_STORE_INCLUDED_KEYWORDS.some((k) => text.includes(k));
}

/** 是否属于当前系统默认经营门店范围 */
export function isActiveStore(store: ActiveStoreLike): boolean {
  if (isExcludedStore(store)) return false;
  const text = storeSearchText(store);
  if (!text) return false;
  return matchesIncludedKeyword(store);
}

export function filterActiveStores<T extends StoreListItem>(stores: T[]): T[] {
  return stores.filter((s) =>
    isActiveStore({
      name: s.name,
      brand: s.brand,
      city: s.city,
      label: formatStoreOptionLabel(s)
    })
  );
}

/** @deprecated 使用 filterActiveStores */
export const getActiveStores = filterActiveStores;

export function getActiveStoresIncludeAll(stores: readonly StoreListItem[]): StoreListItem[] {
  return filterActiveStores([...stores]);
}

export function getActiveStoreIds(stores: readonly StoreListItem[]): string[] {
  return filterActiveStores([...stores]).map((s) => s.id);
}

/** @deprecated 使用 getActiveStoreIds */
export const getActiveStoreIdsFromList = getActiveStoreIds;

export function getActiveHotelStoreIds(stores: readonly StoreListItem[]): string[] {
  return filterActiveStores([...stores])
    .filter((s) => {
      const text = storeSearchText({ name: s.name, brand: s.brand, city: s.city });
      return HOTEL_KEYWORDS.some((k) => text.includes(k));
    })
    .map((s) => s.id);
}

export function getActiveRestaurantStoreIds(stores: readonly StoreListItem[]): string[] {
  return filterActiveStores([...stores])
    .filter((s) => {
      const text = storeSearchText({ name: s.name, brand: s.brand, city: s.city });
      return RESTAURANT_KEYWORDS.some((k) => text.includes(k));
    })
    .map((s) => s.id);
}

export function getStoreDisplayName(store: StoreListItem): string {
  return normalizeStoreDisplayName(store);
}

export function normalizeStoreDisplayName(store: StoreListItem): string {
  return formatStoreOptionLabel(store);
}

export type ActiveStoreSelectOption = {
  value: string;
  label: string;
};

export function getActiveStoreSelectOptions(
  stores: readonly StoreListItem[],
  allValue: string = 全部门店值
): ActiveStoreSelectOption[] {
  return [
    { value: allValue, label: "全部门店" },
    ...filterActiveStores([...stores]).map((s) => ({
      value: s.id,
      label: normalizeStoreDisplayName(s)
    }))
  ];
}

export function filterActiveMockStores(): StoreMaster[] {
  return 门店主数据.filter((s) =>
    isActiveStore({ label: s.显示名称, name: s.门店名称, brand: s.品牌 })
  );
}

export function getDefaultExampleStoreLabel(): string {
  const active = filterActiveMockStores();
  const zetong = active.find(
    (s) => s.品牌.includes("泽桐") || s.门店名称.includes("星程中山西")
  );
  const pick = zetong ?? active[0];
  return pick ? `${pick.品牌}-${pick.门店名称}` : "泽桐-星程中山西";
}

export function findDefaultActiveSupabaseStoreId(stores: readonly StoreListItem[]): string | null {
  const active = filterActiveStores([...stores]);
  const zetong = active.find(
    (s) =>
      s.name.includes("泽桐") ||
      s.name.includes("星程中山西") ||
      s.brand.includes("泽桐") ||
      (s.name.includes("星程") && s.name.includes("中山西"))
  );
  return zetong?.id ?? active[0]?.id ?? null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSupabaseStoreUuid(id: string | null | undefined): boolean {
  return Boolean(id && UUID_RE.test(id));
}

export function isLegacyMockStoreId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id.startsWith("hotel-") || id.startsWith("rest-");
}

export function sanitizeCachedStoreSelection(
  storeId: string | null | undefined,
  activeStores: readonly StoreListItem[]
): { storeScope: "all" | "single"; storeId: string | null } {
  if (!storeId || storeId === 全部门店值) {
    return { storeScope: "all", storeId: null };
  }
  if (isLegacyMockStoreId(storeId) || !isSupabaseStoreUuid(storeId)) {
    const fallback = findDefaultActiveSupabaseStoreId(activeStores);
    if (fallback) return { storeScope: "single", storeId: fallback };
    return { storeScope: "all", storeId: null };
  }
  const active = filterActiveStores([...activeStores]);
  if (active.some((s) => s.id === storeId)) {
    return { storeScope: "single", storeId };
  }
  const fallback = findDefaultActiveSupabaseStoreId(active);
  if (fallback) return { storeScope: "single", storeId: fallback };
  return { storeScope: "all", storeId: null };
}

export function isOutOfActiveScopeStoreName(name: string): boolean {
  return isExcludedStore({ name, label: name });
}

export const OUT_OF_ACTIVE_SCOPE_IMPORT_MESSAGE =
  "该门店不在当前经营管理范围内，已跳过";

/** 汇总表标题用 */
export const ACTIVE_STORES_AGGREGATE_LABEL = "当前经营门店汇总";
