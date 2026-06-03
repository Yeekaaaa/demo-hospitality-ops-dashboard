/**
 * Dashboard / 酒店运营：与财务报表一致的 actual_data 门店范围解析
 */

import {
  getActiveHotelStoreIds,
  getActiveRestaurantStoreIds,
  getActiveStoreIds,
  isSupabaseStoreUuid
} from "@/lib/active-store-scope";
import { 全部门店值 } from "@/lib/store-master";
import type { BoardTypeFilter } from "@/src/lib/dashboard-data-service";
import type { ActualDataStoreScope } from "@/src/lib/active-store-ids";
import type { StoreListItem } from "@/src/lib/supabase";

/** 驾驶舱看板 → actual_data 查询范围（Supabase store_id UUID） */
export function dashboardToActualDataScope(
  storeId: string,
  boardType: BoardTypeFilter,
  stores: readonly StoreListItem[]
): ActualDataStoreScope {
  const activeIds = getActiveStoreIds(stores);
  const hotelIds = getActiveHotelStoreIds(stores);
  const restIds = getActiveRestaurantStoreIds(stores);

  let ids =
    boardType === "hotelBoard" ? hotelIds : boardType === "restaurantBoard" ? restIds : activeIds;

  if (storeId !== 全部门店值) {
    if (!isSupabaseStoreUuid(storeId) || !activeIds.includes(storeId)) {
      return [];
    }
    ids = ids.filter((id) => id === storeId);
  }

  if (ids.length === 0) return [];
  if (ids.length === 1) return ids[0]!;
  return ids;
}

/** 酒店运营页 → actual_data 范围（仅 active 酒店 UUID） */
export function hotelOperationsToActualDataScope(
  localHotel: "all" | string,
  stores: readonly StoreListItem[]
): ActualDataStoreScope {
  const hotelIds = getActiveHotelStoreIds(stores);
  if (hotelIds.length === 0) return [];

  if (localHotel === "all") return hotelIds;
  if (isSupabaseStoreUuid(localHotel) && hotelIds.includes(localHotel)) {
    return localHotel;
  }
  return hotelIds;
}

/** 餐饮运营页 → actual_data 范围（当前仅唯一在营餐饮门店，如西北赋） */
export function restaurantOperationsActualDataScope(
  stores: readonly StoreListItem[]
): ActualDataStoreScope {
  const restIds = getActiveRestaurantStoreIds(stores);
  if (restIds.length === 0) return [];
  return restIds[0]!;
}
