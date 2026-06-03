/**
 * 从 actual_data 聚合科目推导餐饮运营 KPI（不含酒店房晚/ADR/RevPAR 等字段）
 */

export type RestaurantOperationsKpisFromActual = {
  营业收入: number;
  总成本: number;
  利润: number;
  /** profit / revenue，revenue≤0 时为 0 */
  利润率: number;
  /** total_cost / revenue，revenue≤0 时为 0 */
  成本率: number;
  /** 经营科目有「原材料成本」时填入，否则为 0 */
  原材料成本: number;
};

function pick(os: Record<string, number>, ...keys: string[]): number {
  for (const k of keys) {
    const v = os[k];
    if (v != null && Number.isFinite(v)) return v;
  }
  return 0;
}

export function restaurantKpisFromOperatingSubjects(
  operatingSubjects: Record<string, number>
): RestaurantOperationsKpisFromActual {
  const 营业收入 = pick(operatingSubjects, "营业收入");
  const 总成本 = pick(operatingSubjects, "总成本");
  const 利润 = pick(operatingSubjects, "利润");
  const rev = 营业收入 > 0 ? 营业收入 : 0;
  const 利润率 = rev > 0 ? 利润 / rev : 0;
  const 成本率 = rev > 0 ? 总成本 / rev : 0;
  const 原材料成本 = pick(operatingSubjects, "原材料成本");

  return {
    营业收入,
    总成本,
    利润,
    利润率,
    成本率,
    原材料成本
  };
}
