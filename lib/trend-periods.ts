/**
 * 趋势图账期：从门店开业账期起算，不补 0、不凑满固定 6 期
 */

import type { DbPeriod } from "@/lib/dashboard-metrics";
import { getPreviousPeriod } from "@/lib/dashboard-metrics";
import { resolveStoreOpeningPeriodOrEarliest } from "@/lib/store-opening-periods";

export function compareMonthPeriodValue(a: string, b: string): number {
  const pa = a.match(/^(\d{4})-(\d{2})$/);
  const pb = b.match(/^(\d{4})-(\d{2})$/);
  if (!pa || !pb) return a.localeCompare(b);
  const ya = Number(pa[1]);
  const yb = Number(pb[1]);
  if (ya !== yb) return ya - yb;
  return Number(pa[2]) - Number(pb[2]);
}

/** 从 end 向前收集账期（含 end），仅保留 >= minInclusive 的月份；最多 maxCount 个（从 end 往回数） */
export function listMonthPeriodsBackFromEnd(
  end: DbPeriod,
  minInclusive: string,
  maxCount = 6
): DbPeriod[] {
  if (end.period_type !== "month") {
    return [end];
  }

  const collected: DbPeriod[] = [];
  let p: DbPeriod = end;

  while (collected.length < maxCount) {
    if (compareMonthPeriodValue(p.period_value, minInclusive) >= 0) {
      collected.push(p);
    }
    if (compareMonthPeriodValue(p.period_value, minInclusive) <= 0) {
      break;
    }
    p = getPreviousPeriod(p.period_type, p.period_value);
  }

  return collected.reverse();
}

export type TrendStoreRef = { store_id: string; store_name?: string };

/** 单店：起点 = 该店开业账期 */
export function trendPeriodsForSingleStore(
  end: DbPeriod,
  storeId: string,
  storeName?: string,
  maxCount = 6
): DbPeriod[] {
  const opening = resolveStoreOpeningPeriodOrEarliest(storeId, storeName);
  return listMonthPeriodsBackFromEnd(end, opening, maxCount);
}

/**
 * 全部门店：起点 = 所有参与门店中最早的开业账期
 * 各店在聚合时仍按自身开业账期过滤
 */
export function trendPeriodsForAllStores(
  end: DbPeriod,
  stores: TrendStoreRef[],
  maxCount = 6
): DbPeriod[] {
  if (!stores.length) {
    return listMonthPeriodsBackFromEnd(end, "1970-01", maxCount);
  }

  let earliestOpening = "9999-12";
  for (const s of stores) {
    const op = resolveStoreOpeningPeriodOrEarliest(s.store_id, s.store_name);
    if (compareMonthPeriodValue(op, earliestOpening) < 0) {
      earliestOpening = op;
    }
  }

  return listMonthPeriodsBackFromEnd(end, earliestOpening, maxCount);
}

export function isStoreOpenInPeriod(
  storeId: string,
  storeName: string | undefined,
  periodValue: string
): boolean {
  const opening = resolveStoreOpeningPeriodOrEarliest(storeId, storeName);
  return compareMonthPeriodValue(periodValue, opening) >= 0;
}
