/**
 * 标准预算科目清单（预算模板、导入校验、预算管理展示共用）
 */

import type { FinancialLineActual } from "@/lib/mock-analytics";

export type BudgetSubjectGroup =
  | "收入预算"
  | "酒店运营预算"
  | "餐饮运营预算"
  | "成本预算"
  | "费用预算"
  | "利润预算"
  | "现金流预算"
  | "人员与组织预算"
  | "经营动作与风险预算";

export type BudgetValueKind = "wan" | "yuan" | "percent" | "count" | "times";

/** 差异状态判定方向 */
export type BudgetSubjectDirection = "revenue" | "cost" | "profit" | "operating_high" | "risk";

export type BudgetSubjectDefinition = {
  label: string;
  group: BudgetSubjectGroup;
  unit: string;
  kind: BudgetValueKind;
  direction: BudgetSubjectDirection;
  description: string;
  /** mock 实际/默认预算映射到利润表字段 */
  financialKey?: keyof FinancialLineActual;
  /** 旧版 localStorage 科目名兼容 */
  legacyKeys?: string[];
};

export type BudgetGroupFilter =
  | "全部"
  | "收入"
  | "酒店运营"
  | "餐饮运营"
  | "成本"
  | "费用"
  | "利润"
  | "现金流"
  | "人员"
  | "风险";

/** @deprecated 使用 lib/budget-versions 的 getBudgetVersionLabel */
export { DEFAULT_BUDGET_VERSION as BUDGET_VERSION_DEFAULT_VALUE } from "@/lib/budget-versions";
export const BUDGET_VERSION_DEFAULT = "基准版";

const G = {
  收入: "收入预算" as const,
  酒店: "酒店运营预算" as const,
  餐饮: "餐饮运营预算" as const,
  成本: "成本预算" as const,
  费用: "费用预算" as const,
  利润: "利润预算" as const,
  现金流: "现金流预算" as const,
  人员: "人员与组织预算" as const,
  风险: "经营动作与风险预算" as const
};

function def(
  label: string,
  group: BudgetSubjectGroup,
  unit: string,
  kind: BudgetValueKind,
  direction: BudgetSubjectDirection,
  description: string,
  extra?: { financialKey?: keyof FinancialLineActual; legacyKeys?: string[] }
): BudgetSubjectDefinition {
  return { label, group, unit, kind, direction, description, ...extra };
}

/** 73 项标准预算科目（顺序固定） */
export const BUDGET_SUBJECT_CATALOG: readonly BudgetSubjectDefinition[] = [
  def("总营业收入", G.收入, "元", "yuan", "revenue", "门店整体营业收入，可由下方收入项汇总，也可作为老板预算总目标录入。", {
    financialKey: "营业收入",
    legacyKeys: ["营业收入", "总营业收入"]
  }),
  def("客房收入", G.收入, "元", "yuan", "revenue", "酒店客房销售收入。", { financialKey: "客房收入" }),
  def("餐饮收入", G.收入, "元", "yuan", "revenue", "餐厅、早餐、包间、宴请、堂食、外卖等餐饮收入。", {
    financialKey: "餐饮收入"
  }),
  def("商品/零售收入", G.收入, "元", "yuan", "revenue", "小商品、伴手礼、酒水零售等收入。", { financialKey: "其他收入" }),
  def("会议/场地收入", G.收入, "元", "yuan", "revenue", "会议室、活动场地、团建场地等收入。"),
  def("其他收入", G.收入, "元", "yuan", "revenue", "停车、洗衣、赔偿、杂项收入等。"),
  def("可售房间数", G.酒店, "间夜", "count", "operating_high", "当月理论可售房间数，等于房间数 × 当月天数。"),
  def("已售房间数", G.酒店, "间夜", "count", "operating_high", "预算期预计卖出的房间夜数。"),
  def("出租率", G.酒店, "%", "percent", "operating_high", "已售房间数 / 可售房间数。"),
  def("ADR 平均房价", G.酒店, "元/间夜", "yuan", "operating_high", "客房收入 / 已售房间数。"),
  def("RevPAR", G.酒店, "元/间夜", "yuan", "operating_high", "客房收入 / 可售房间数。"),
  def("早餐人数", G.酒店, "人次", "count", "operating_high", "酒店早餐预计接待人数。"),
  def("会员间夜数", G.酒店, "间夜", "count", "operating_high", "会员渠道贡献的间夜。"),
  def("OTA 间夜数", G.酒店, "间夜", "count", "operating_high", "携程、美团、飞猪等 OTA 渠道贡献的间夜。"),
  def("协议客户间夜数", G.酒店, "间夜", "count", "operating_high", "企业协议客户贡献的间夜。"),
  def("散客间夜数", G.酒店, "间夜", "count", "operating_high", "非会员、非协议、非团队的散客间夜。"),
  def("堂食收入", G.餐饮, "元", "yuan", "revenue", "餐厅堂食收入。"),
  def("外卖收入", G.餐饮, "元", "yuan", "revenue", "美团、饿了么、自营外卖等收入。"),
  def("包间/宴请收入", G.餐饮, "元", "yuan", "revenue", "包间、宴请、团餐等收入。"),
  def("客流量", G.餐饮, "人次", "count", "operating_high", "餐饮预计接待客流。"),
  def("客单价", G.餐饮, "元/人", "yuan", "operating_high", "餐饮收入 / 客流量。"),
  def("翻台率", G.餐饮, "次", "times", "operating_high", "餐桌周转效率。"),
  def("原材料成本", G.餐饮, "元", "yuan", "cost", "食材、调料、饮品原料等成本。", { financialKey: "原材料成本" }),
  def("原材料成本率", G.餐饮, "%", "percent", "cost", "原材料成本 / 餐饮收入。"),
  def("总成本", G.成本, "元", "yuan", "cost", "经营成本总额。"),
  def("人力成本", G.成本, "元", "yuan", "cost", "工资、社保、奖金、临时工等。", { financialKey: "人力成本" }),
  def("能源费用", G.成本, "元", "yuan", "cost", "水、电、燃气、供暖等。", { financialKey: "能源费用" }),
  def("华住管理费", G.成本, "元", "yuan", "cost", "加盟管理费、品牌管理费、系统相关费用等。", {
    financialKey: "华住管理费"
  }),
  def("客房服务成本", G.成本, "元", "yuan", "cost", "布草、清洁用品、客耗品、客房维护等。", {
    financialKey: "客房服务成本"
  }),
  def("非客房服务成本", G.成本, "元", "yuan", "cost", "前厅、公共区域、行政后勤等非客房直接服务成本。", {
    financialKey: "非客房服务成本"
  }),
  def("餐饮人工成本", G.成本, "元", "yuan", "cost", "厨师、服务员、后厨、小时工等餐饮人工成本。"),
  def("餐饮能耗成本", G.成本, "元", "yuan", "cost", "餐饮水电气、厨房能源等。"),
  def("维修维护成本", G.成本, "元", "yuan", "cost", "设备维修、工程维护、房间维修等。"),
  def("洗涤成本", G.成本, "元", "yuan", "cost", "布草洗涤、制服洗涤等。"),
  def("低值易耗品成本", G.成本, "元", "yuan", "cost", "一次性用品、小工具、消耗品等。"),
  def("采购成本", G.成本, "元", "yuan", "cost", "日常采购支出，可与具体成本科目并行管理。"),
  def("销售费用", G.费用, "元", "yuan", "cost", "营销推广、OTA 推广、广告、佣金等。"),
  def("OTA 佣金", G.费用, "元", "yuan", "cost", "线上渠道佣金。"),
  def("市场推广费", G.费用, "元", "yuan", "cost", "广告、活动、团购推广等。"),
  def("管理费用", G.费用, "元", "yuan", "cost", "行政、办公、管理人员、总部支持等费用。"),
  def("办公费用", G.费用, "元", "yuan", "cost", "办公用品、打印、通讯等。"),
  def("差旅交通费", G.费用, "元", "yuan", "cost", "差旅、交通、车辆使用等。"),
  def("财务费用", G.费用, "元", "yuan", "cost", "利息、手续费、贷款相关费用等。"),
  def("租金/物业费", G.费用, "元", "yuan", "cost", "租金、物业管理费等。"),
  def("税费", G.费用, "元", "yuan", "cost", "经营相关税费。"),
  def("保险费用", G.费用, "元", "yuan", "cost", "财产险、雇主责任险、公众责任险等。"),
  def("培训费用", G.费用, "元", "yuan", "cost", "员工培训、服务培训、系统培训等。"),
  def("营业利润", G.利润, "元", "yuan", "profit", "收入扣除成本费用后的经营利润。", { financialKey: "营业利润" }),
  def("GOP", G.利润, "元", "yuan", "profit", "酒店经营毛利润 Gross Operating Profit。"),
  def("净利润", G.利润, "元", "yuan", "profit", "最终净利润。"),
  def("利润率", G.利润, "%", "percent", "profit", "营业利润 / 总营业收入。", { financialKey: "利润率" }),
  def("GOP率", G.利润, "%", "percent", "profit", "GOP / 总营业收入。"),
  def("EBITDA", G.利润, "元", "yuan", "profit", "息税折旧摊销前利润，可选预算项。"),
  def("经营现金流", G.现金流, "元", "yuan", "profit", "经营活动产生的现金流。"),
  def("投资现金流", G.现金流, "元", "yuan", "cost", "装修、设备、改造等投资现金流。"),
  def("融资现金流", G.现金流, "元", "yuan", "cost", "贷款、还款、股东投入等融资现金流。"),
  def("期初现金余额", G.现金流, "元", "yuan", "profit", "预算期开始时现金余额。"),
  def("期末现金余额", G.现金流, "元", "yuan", "profit", "预算期结束时现金余额。"),
  def("应收账款余额", G.现金流, "元", "yuan", "cost", "协议客户、挂账、平台应收等。"),
  def("应付账款余额", G.现金流, "元", "yuan", "cost", "供应商、工程、采购等应付款。"),
  def("员工人数", G.人员, "人", "count", "operating_high", "预算期预计员工人数。"),
  def("全职员工人数", G.人员, "人", "count", "operating_high", "正式员工人数。"),
  def("兼职/小时工人数", G.人员, "人", "count", "operating_high", "临时工、小时工人数。"),
  def("人效", G.人员, "元/人", "yuan", "operating_high", "总营业收入 / 员工人数。"),
  def("人力成本率", G.人员, "%", "percent", "cost", "人力成本 / 总营业收入。"),
  def("装修投入", G.风险, "元", "yuan", "cost", "翻新、升级、改造投入。"),
  def("设备投入", G.风险, "元", "yuan", "cost", "厨房设备、客房设备、工程设备等。"),
  def("会员增长目标", G.风险, "人", "count", "operating_high", "新增会员目标。"),
  def("好评数量目标", G.风险, "条", "count", "operating_high", "平台好评数量目标。"),
  def("差评控制目标", G.风险, "条", "count", "risk", "预算期允许或目标控制的差评数量。"),
  def("投诉数量控制", G.风险, "条", "count", "risk", "客户投诉控制目标。"),
  def("安全事故控制", G.风险, "次", "count", "risk", "安全事故目标，通常应为 0。"),
  def("卫生检查不合格次数", G.风险, "次", "count", "risk", "巡检、卫生检查不合格次数控制目标。")
] as const;

export const BUDGET_SUBJECT_LABELS = BUDGET_SUBJECT_CATALOG.map((s) => s.label);

const aliasMap = new Map<string, string>();
for (const s of BUDGET_SUBJECT_CATALOG) {
  aliasMap.set(s.label, s.label);
  s.legacyKeys?.forEach((k) => aliasMap.set(k, s.label));
}
aliasMap.set("总营业收入", "总营业收入");
aliasMap.set("营业收入", "总营业收入");
aliasMap.set("总营业成本", "总营业成本");
aliasMap.set("营业成本", "总营业成本");
aliasMap.set("运营成本", "总营业成本");
aliasMap.set("总成本", "总营业成本");
aliasMap.set("经营利润", "经营利润");
aliasMap.set("运营利润", "经营利润");
aliasMap.set("利润", "经营利润");
aliasMap.set("营业利润", "经营利润");

export function resolveBudgetSubjectLabel(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return aliasMap.get(t) ?? (BUDGET_SUBJECT_LABELS.includes(t as (typeof BUDGET_SUBJECT_LABELS)[number]) ? t : null);
}

export function subjectMatchesGroupFilter(subject: BudgetSubjectDefinition, filter: BudgetGroupFilter): boolean {
  if (filter === "全部") return true;
  const map: Record<BudgetGroupFilter, BudgetSubjectGroup | BudgetSubjectGroup[]> = {
    全部: [],
    收入: G.收入,
    酒店运营: G.酒店,
    餐饮运营: G.餐饮,
    成本: G.成本,
    费用: G.费用,
    利润: G.利润,
    现金流: G.现金流,
    人员: G.人员,
    风险: G.风险
  };
  const g = map[filter];
  return subject.group === g;
}

/** 泽桐-星程中山西 2026-04 示例预算值（元/%/间夜等按科目 kind） */
export const BUDGET_SUBJECT_DEMO_VALUES: Record<string, number> = {
  总营业收入: 1800000,
  客房收入: 1320000,
  餐饮收入: 280000,
  "商品/零售收入": 60000,
  "会议/场地收入": 80000,
  其他收入: 60000,
  可售房间数: 3600,
  已售房间数: 2880,
  出租率: 80,
  "ADR 平均房价": 458,
  RevPAR: 367,
  早餐人数: 4200,
  会员间夜数: 820,
  "OTA 间夜数": 1050,
  协议客户间夜数: 480,
  散客间夜数: 530,
  堂食收入: 180000,
  外卖收入: 60000,
  "包间/宴请收入": 40000,
  客流量: 3200,
  客单价: 86,
  翻台率: 2.1,
  原材料成本: 120000,
  原材料成本率: 42,
  总成本: 1280000,
  人力成本: 420000,
  能源费用: 140000,
  华住管理费: 110000,
  客房服务成本: 180000,
  非客房服务成本: 80000,
  餐饮人工成本: 90000,
  餐饮能耗成本: 40000,
  维修维护成本: 50000,
  洗涤成本: 40000,
  低值易耗品成本: 30000,
  采购成本: 60000,
  销售费用: 70000,
  "OTA 佣金": 50000,
  市场推广费: 30000,
  管理费用: 120000,
  办公费用: 20000,
  差旅交通费: 15000,
  财务费用: 10000,
  "租金/物业费": 0,
  税费: 30000,
  保险费用: 8000,
  培训费用: 5000,
  营业利润: 520000,
  GOP: 580000,
  净利润: 450000,
  利润率: 28.9,
  GOP率: 32.2,
  EBITDA: 620000,
  经营现金流: 480000,
  投资现金流: 80000,
  融资现金流: 0,
  期初现金余额: 1200000,
  期末现金余额: 1600000,
  应收账款余额: 150000,
  应付账款余额: 220000,
  员工人数: 38,
  全职员工人数: 32,
  "兼职/小时工人数": 6,
  人效: 47368,
  人力成本率: 23.3,
  装修投入: 0,
  设备投入: 50000,
  会员增长目标: 200,
  好评数量目标: 120,
  差评控制目标: 8,
  投诉数量控制: 3,
  安全事故控制: 0,
  卫生检查不合格次数: 0
};
