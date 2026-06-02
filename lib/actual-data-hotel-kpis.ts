/**
 * 从 actual_data 聚合科目推导酒店运营 KPI（与 mock getHotelOperationsKpis 字段对齐）
 */

export type HotelOperationsKpisFromActual = {
  可售间夜: number;
  已售间数: number;
  入住率: number;
  平均房价: number;
  revpar: number;
  客房收入: number;
  华住管理费: number;
  人力成本: number;
  能源费用: number;
};

function pick(os: Record<string, number>, ...keys: string[]): number {
  for (const k of keys) {
    const v = os[k];
    if (v != null && Number.isFinite(v)) return v;
  }
  return 0;
}

export function hotelKpisFromOperatingSubjects(
  operatingSubjects: Record<string, number>
): HotelOperationsKpisFromActual {
  const 可售间夜 = Math.round(pick(operatingSubjects, "可售房晚", "可售间夜"));
  const 已售间夜 = Math.round(pick(operatingSubjects, "已售房晚", "已售间数"));
  const 客房收入 = pick(operatingSubjects, "客房收入");
  const 入住率 = 可售间夜 > 0 ? 已售间夜 / 可售间夜 : 0;
  const roomYuan = 客房收入 * 10000;
  const 平均房价 = 已售间夜 > 0 && roomYuan > 0 ? roomYuan / 已售间夜 : 0;
  /** RevPAR（元/可售间夜）：room_revenue 为万元，见 docs/data-caliber-freeze.md */
  const revpar = 可售间夜 > 0 && roomYuan > 0 ? roomYuan / 可售间夜 : 0;

  return {
    可售间夜,
    已售间数: 已售间夜,
    入住率,
    平均房价: Math.round(平均房价 * 10) / 10,
    revpar: Math.round(revpar * 10) / 10,
    客房收入,
    华住管理费: pick(operatingSubjects, "华住管理费"),
    人力成本: pick(operatingSubjects, "人工成本", "人力成本"),
    能源费用: pick(operatingSubjects, "能耗成本", "能源费用")
  };
}
