import { isExcludedFromActiveScope } from "@/lib/active-store-scope";

/** 统一门店主数据（演示环境） */

export type StoreBusinessType = "酒店" | "餐饮";

export interface StoreMaster {
  id: string;
  业态: StoreBusinessType;
  /** 业主 / 管理方简称 */
  品牌: string;
  /** 品牌线 + 位置简称 */
  门店名称: string;
  城市: string;
  /** 列表与下拉展示用 */
  显示名称: string;
}

export const 门店主数据: StoreMaster[] = [
  {
    id: "hotel-mujia-quanji-huaianxi",
    业态: "酒店",
    品牌: "沐家",
    门店名称: "全季槐安西",
    城市: "石家庄",
    显示名称: "沐家｜全季槐安西｜石家庄"
  },
  {
    id: "hotel-zetong-xingcheng-zhongshanxi",
    业态: "酒店",
    品牌: "泽桐",
    门店名称: "星程中山西",
    城市: "石家庄",
    显示名称: "泽桐｜星程中山西｜石家庄"
  },
  {
    id: "hotel-yuhang-quanji-zhongshanxi",
    业态: "酒店",
    品牌: "雨航",
    门店名称: "全季中山西",
    城市: "石家庄",
    显示名称: "雨航｜全季中山西｜石家庄"
  },
  {
    id: "rest-xibeifu-sjz",
    业态: "餐饮",
    品牌: "西北赋",
    门店名称: "石家庄店",
    城市: "石家庄",
    显示名称: "西北赋｜石家庄"
  }
];

export const 全部门店值 = "all";

/** 已出租/停业或修整中，不在前台门店列表展示（本地 mock id） */
export const 停用门店主数据Id = new Set<string>(["hotel-jinyuan-suide", "rest-mian-sjz"]);

/** 是否在前台隐藏（下拉、排行、演示汇总等）— 与 active-store-scope 一致 */
export function isStoreHiddenFromUi(opts: { id?: string; label?: string }): boolean {
  if (opts.id && 停用门店主数据Id.has(opts.id)) return true;
  return isExcludedFromActiveScope({ label: opts.label, name: opts.label });
}

export function getStoreById(id: string): StoreMaster | undefined {
  return 门店主数据.find((s) => s.id === id);
}

export function getHotelStores(): StoreMaster[] {
  return 门店主数据.filter((s) => s.业态 === "酒店");
}

export function getRestaurantStores(): StoreMaster[] {
  return 门店主数据.filter((s) => s.业态 === "餐饮");
}
