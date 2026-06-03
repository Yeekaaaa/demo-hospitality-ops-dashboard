/**
 * 经营数据 Excel / actual_data 字段元数据
 *
 * - OPERATING_DATA_EXTENSION_IMPORT_COLUMNS：下载模板「数据模板」sheet 输入列
 * - OPERATING_DATA_LEGACY_IMPORT_COLUMNS：仅解析/入库兼容旧模板，不出现在新模板表头
 * - OPERATING_DATA_CALCULATED_FIELD_ROWS：仅「字段说明」sheet，系统计算项
 */

export type AssetImportFieldKind = "ratio_or_percent" | "yuan" | "wan" | "count" | "integer";

export type AssetFieldDescriptionGroup =
  | "经营结果"
  | "酒店房量指标"
  | "渠道结构"
  | "成本结构"
  | "利润与现金流"
  | "运营风险";

export type AssetImportColumnMeta = {
  headerZh: string;
  dbKey: string;
  kind: AssetImportFieldKind;
  fieldGroup: AssetFieldDescriptionGroup;
  /** 覆盖默认填写说明（渠道结构等） */
  fillHelp?: string;
};

export const RATIO_IMPORT_HELP_TEXT = "可填写 31% 或 0.31，系统导入时统一转为 0–1 小数。";

export const YUAN_IMPORT_HELP_TEXT = "单位为元，留空则不写入。";

/** @deprecated 使用 YUAN_IMPORT_HELP_TEXT；保留供旧模板 kind 兼容 */
export const WAN_IMPORT_HELP_TEXT = YUAN_IMPORT_HELP_TEXT;

export const COUNT_IMPORT_HELP_TEXT = "填写非负整数，留空则不写入。";

export const INTEGER_IMPORT_HELP_TEXT = "填写非负整数（间夜/房间数），留空则不写入。";

const CHANNEL_OTA_HELP =
  "携程、美团、飞猪、Booking 等线上平台产生的已售房晚 ÷ 总已售房晚。" + RATIO_IMPORT_HELP_TEXT;

const CHANNEL_MEMBER_HELP =
  "华住会或自有会员产生的已售房晚 ÷ 总已售房晚。" + RATIO_IMPORT_HELP_TEXT;

const CHANNEL_CORPORATE_HELP =
  "企业协议、团体协议客户产生的房晚 ÷ 总已售房晚。" + RATIO_IMPORT_HELP_TEXT;

const CHANNEL_WALKIN_HELP =
  "非会员、非协议、非 OTA 的零散客户房晚 ÷ 总已售房晚。" + RATIO_IMPORT_HELP_TEXT;

const CHANNEL_DIRECT_HELP =
  "前台、电话、微信、私域等直接销售产生的房晚 ÷ 总已售房晚。" + RATIO_IMPORT_HELP_TEXT;

const HUAZHU_MANAGEMENT_FEE_HELP =
  "包括华住管理费、会员卡售卖上交等管理费类成本，单位为元；不得作为收入抵减，不与营业收入冲减。" +
  YUAN_IMPORT_HELP_TEXT;

/** 新模板输入列（顺序与「数据模板」表头一致，接在 9 个基础列之后） */
export const OPERATING_DATA_EXTENSION_IMPORT_COLUMNS: readonly AssetImportColumnMeta[] = [
  { headerZh: "营业成本", dbKey: "business_cost", kind: "yuan", fieldGroup: "经营结果" },
  { headerZh: "运营成本", dbKey: "operating_cost", kind: "yuan", fieldGroup: "经营结果" },
  { headerZh: "运营利润", dbKey: "operating_profit", kind: "yuan", fieldGroup: "经营结果" },
  { headerZh: "时租房间数", dbKey: "hourly_rooms_sold", kind: "integer", fieldGroup: "酒店房量指标" },
  { headerZh: "过夜房间数", dbKey: "overnight_rooms_sold", kind: "integer", fieldGroup: "酒店房量指标" },
  {
    headerZh: "OTA间夜占比",
    dbKey: "ota_room_night_ratio",
    kind: "ratio_or_percent",
    fieldGroup: "渠道结构",
    fillHelp: CHANNEL_OTA_HELP
  },
  {
    headerZh: "会员间夜占比",
    dbKey: "member_room_night_ratio",
    kind: "ratio_or_percent",
    fieldGroup: "渠道结构",
    fillHelp: CHANNEL_MEMBER_HELP
  },
  {
    headerZh: "协议客户占比",
    dbKey: "corporate_customer_ratio",
    kind: "ratio_or_percent",
    fieldGroup: "渠道结构",
    fillHelp: CHANNEL_CORPORATE_HELP
  },
  {
    headerZh: "散客占比",
    dbKey: "walkin_customer_ratio",
    kind: "ratio_or_percent",
    fieldGroup: "渠道结构",
    fillHelp: CHANNEL_WALKIN_HELP
  },
  {
    headerZh: "直销占比",
    dbKey: "direct_sales_ratio",
    kind: "ratio_or_percent",
    fieldGroup: "渠道结构",
    fillHelp: CHANNEL_DIRECT_HELP
  },
  { headerZh: "销售费用", dbKey: "sales_expense", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "非客房服务成本", dbKey: "non_room_service_cost", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "客房服务成本", dbKey: "room_service_cost", kind: "yuan", fieldGroup: "成本结构" },
  {
    headerZh: "华住管理费",
    dbKey: "huazhu_management_fee",
    kind: "yuan",
    fieldGroup: "成本结构",
    fillHelp: HUAZHU_MANAGEMENT_FEE_HELP
  },
  { headerZh: "房租", dbKey: "rent", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "税金及附加", dbKey: "tax_and_surcharge", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "员工奖金", dbKey: "staff_bonus", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "后勤奖金", dbKey: "back_office_bonus", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "店长奖金", dbKey: "manager_bonus", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "装修及固定资产摊销", dbKey: "depreciation_amortization", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "其他业务收入", dbKey: "other_business_income", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "管理费用", dbKey: "management_expense", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "营业外收入", dbKey: "non_operating_income", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "净利润", dbKey: "net_profit", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "摊销后纯利润", dbKey: "profit_after_amortization", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "差评数", dbKey: "negative_review_count", kind: "count", fieldGroup: "运营风险" },
  { headerZh: "投诉数", dbKey: "complaint_count", kind: "count", fieldGroup: "运营风险" },
  { headerZh: "异常维修数", dbKey: "abnormal_repair_count", kind: "count", fieldGroup: "运营风险" },
  { headerZh: "员工流失率", dbKey: "staff_turnover_rate", kind: "ratio_or_percent", fieldGroup: "运营风险" },
  { headerZh: "同商圈新增竞品数", dbKey: "nearby_new_competitor_count", kind: "count", fieldGroup: "运营风险" },
  { headerZh: "营业外支出", dbKey: "non_operating_expense", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "财务费用", dbKey: "financial_expense", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "后勤管理费", dbKey: "back_office_management_fee", kind: "yuan", fieldGroup: "成本结构" }
] as const;

/** 旧版模板扩展列：仍支持上传解析与入库，不进入新下载模板 */
export const OPERATING_DATA_LEGACY_IMPORT_COLUMNS: readonly AssetImportColumnMeta[] = [
  { headerZh: "人工成本", dbKey: "labor_cost", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "人工成本率", dbKey: "labor_cost_ratio", kind: "ratio_or_percent", fieldGroup: "成本结构" },
  { headerZh: "能耗成本", dbKey: "energy_cost", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "能耗成本率", dbKey: "energy_cost_ratio", kind: "ratio_or_percent", fieldGroup: "成本结构" },
  { headerZh: "早餐成本", dbKey: "breakfast_cost", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "洗涤成本", dbKey: "laundry_cost", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "易耗品成本", dbKey: "consumable_cost", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "维修成本", dbKey: "repair_cost", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "营销费用", dbKey: "marketing_cost", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "品牌管理费", dbKey: "brand_fee", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "中央预订及会员费", dbKey: "reservation_member_fee", kind: "yuan", fieldGroup: "成本结构" },
  { headerZh: "GOP", dbKey: "gop", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "GOP率", dbKey: "gop_margin", kind: "ratio_or_percent", fieldGroup: "利润与现金流" },
  { headerZh: "NOI", dbKey: "noi", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "经营现金流", dbKey: "operating_cash_flow", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "资本开支", dbKey: "capex", kind: "yuan", fieldGroup: "利润与现金流" },
  { headerZh: "净现金流", dbKey: "net_cash_flow", kind: "yuan", fieldGroup: "利润与现金流" }
] as const;

/** 解析 / upsert 用：新列 + 旧列（旧 Excel 仍可导入） */
export const OPERATING_DATA_ASSET_IMPORT_COLUMNS: readonly AssetImportColumnMeta[] = [
  ...OPERATING_DATA_EXTENSION_IMPORT_COLUMNS,
  ...OPERATING_DATA_LEGACY_IMPORT_COLUMNS
];

/** 新模板「数据模板」表头（仅输入列） */
export const OPERATING_DATA_ASSET_IMPORT_HEADERS = OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.map((c) => c.headerZh);

export const ASSET_FIELD_GROUPS_ORDER: readonly AssetFieldDescriptionGroup[] = [
  "经营结果",
  "酒店房量指标",
  "渠道结构",
  "成本结构",
  "利润与现金流",
  "运营风险"
];

export type CalculatedFieldRow = {
  fieldGroup: AssetFieldDescriptionGroup;
  headerZh: string;
  formula: string;
};

/** 仅字段说明 sheet：系统计算，不导入 */
export const OPERATING_DATA_CALCULATED_FIELD_ROWS: readonly CalculatedFieldRow[] = [
  {
    fieldGroup: "经营结果",
    headerZh: "营业成本占比",
    formula: "营业成本 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "经营结果",
    headerZh: "营业成本单间成本",
    formula: "营业成本（元）÷ 可售间夜（元/间夜）"
  },
  {
    fieldGroup: "经营结果",
    headerZh: "运营成本占比",
    formula: "运营成本 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "经营结果",
    headerZh: "运营利润率",
    formula: "运营利润 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "经营结果",
    headerZh: "运营利润单间利润",
    formula: "运营利润（元）÷ 可售间夜（元/间夜）"
  },
  { fieldGroup: "酒店房量指标", headerZh: "出租率", formula: "已售房晚 ÷ 可售房晚 × 100%" },
  {
    fieldGroup: "酒店房量指标",
    headerZh: "时租出租率",
    formula: "时租房间数 ÷ 可售房晚 × 100%"
  },
  {
    fieldGroup: "酒店房量指标",
    headerZh: "过夜出租率",
    formula: "过夜房间数 ÷ 可售房晚 × 100%"
  },
  {
    fieldGroup: "酒店房量指标",
    headerZh: "平均房价",
    formula: "ADR = 客房收入（元）÷ 已售房晚（元/间夜）"
  },
  {
    fieldGroup: "酒店房量指标",
    headerZh: "过夜均价",
    formula:
      "过夜客房收入 ÷ 过夜房间数；当前无「过夜客房收入」分列字段，待扩展后自动计算（未来可扩展）"
  },
  {
    fieldGroup: "酒店房量指标",
    headerZh: "综合 RevPAR",
    formula: "营业收入（元）÷ 可售间夜（元/间夜）"
  },
  {
    fieldGroup: "酒店房量指标",
    headerZh: "客房 RevPAR",
    formula: "客房收入（元）÷ 可售间夜（元/间夜）"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "销售费用占比",
    formula: "销售费用 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "销售费用单间成本",
    formula: "销售费用（元）÷ 可售间夜"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "非客房服务成本占比",
    formula: "非客房服务成本 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "客房服务成本占比",
    formula: "客房服务成本 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "客房服务单间成本",
    formula: "客房服务成本（元）÷ 可售间夜"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "华住管理费占比",
    formula: "华住管理费 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "华住管理费单间成本",
    formula: "华住管理费（元）÷ 可售间夜"
  },
  { fieldGroup: "成本结构", headerZh: "房租占比", formula: "房租 ÷ 营业收入 × 100%" },
  {
    fieldGroup: "成本结构",
    headerZh: "房租单间成本",
    formula: "房租（元）÷ 可售间夜"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "税金及附加占比",
    formula: "税金及附加 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "税金及附加单间成本",
    formula: "税金及附加（元）÷ 可售间夜"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "员工奖金占比",
    formula: "员工奖金 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "奖金单间房成本",
    formula: "员工奖金（元）÷ 可售间夜"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "店长奖金占比",
    formula: "店长奖金 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "后勤奖金占比",
    formula: "后勤奖金 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "装修及固定资产摊销占比",
    formula: "装修及固定资产摊销 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "成本结构",
    headerZh: "单间摊销成本",
    formula: "装修及固定资产摊销（元）÷ 可售间夜"
  },
  {
    fieldGroup: "利润与现金流",
    headerZh: "运营毛利单间利润",
    formula: "运营毛利（元）÷ 可售间夜；当前无「运营毛利」分列字段，待扩展后自动计算（未来可扩展）"
  },
  {
    fieldGroup: "利润与现金流",
    headerZh: "管理费用占比",
    formula: "管理费用 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "利润与现金流",
    headerZh: "管理费用单间成本",
    formula: "管理费用（元）÷ 可售间夜"
  },
  {
    fieldGroup: "利润与现金流",
    headerZh: "净利润占比",
    formula: "净利润 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "利润与现金流",
    headerZh: "净利润单间利润",
    formula: "净利润（元）÷ 可售间夜"
  },
  {
    fieldGroup: "利润与现金流",
    headerZh: "摊销后纯利润占比",
    formula: "摊销后纯利润 ÷ 营业收入 × 100%"
  },
  {
    fieldGroup: "利润与现金流",
    headerZh: "摊销后纯利润单间",
    formula: "摊销后纯利润（元）÷ 可售间夜"
  },
  {
    fieldGroup: "利润与现金流",
    headerZh: "分配后利润",
    formula:
      "运营利润 - 员工奖金 - 后勤奖金 - 店长奖金 - 后勤管理费 - 财务费用 + 营业外收入 - 营业外支出（系统计算，不入库）"
  }
] as const;

function assetColumnToDescriptionRow(c: AssetImportColumnMeta): string[] {
  const help =
    c.fillHelp ??
    (c.kind === "ratio_or_percent"
      ? RATIO_IMPORT_HELP_TEXT
      : c.kind === "yuan" || c.kind === "wan"
        ? YUAN_IMPORT_HELP_TEXT
        : c.kind === "integer"
          ? INTEGER_IMPORT_HELP_TEXT
          : COUNT_IMPORT_HELP_TEXT);
  const unit =
    c.kind === "ratio_or_percent"
      ? "31% 或 0.31，导入为 0–1"
      : c.kind === "yuan" || c.kind === "wan"
        ? "元"
        : c.kind === "integer"
          ? "非负整数"
          : "非负整数";
  return [c.fieldGroup, c.headerZh, c.dbKey, help, unit];
}

function calculatedToDescriptionRow(c: CalculatedFieldRow): string[] {
  return [c.fieldGroup, c.headerZh, "系统计算，不导入", c.formula, "系统自动计算"];
}

export function assetFieldDescriptionFiveColDataRows(): string[][] {
  return OPERATING_DATA_ASSET_IMPORT_COLUMNS.map(assetColumnToDescriptionRow);
}

export function extensionFieldDescriptionGroupedBlocks(): {
  title: string;
  inputRows: string[][];
  calculatedRows: string[][];
}[] {
  return ASSET_FIELD_GROUPS_ORDER.map((g) => ({
    title: `【${g}】`,
    inputRows: OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.filter((c) => c.fieldGroup === g).map(
      assetColumnToDescriptionRow
    ),
    calculatedRows: OPERATING_DATA_CALCULATED_FIELD_ROWS.filter((c) => c.fieldGroup === g).map(
      calculatedToDescriptionRow
    )
  }));
}

/** @deprecated 使用 extensionFieldDescriptionGroupedBlocks */
export function assetFieldDescriptionGroupedBlocks(): { title: string; rows: string[][] }[] {
  return ASSET_FIELD_GROUPS_ORDER.map((g) => ({
    title: `【${g}】`,
    rows: OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.filter((c) => c.fieldGroup === g).map(
      assetColumnToDescriptionRow
    )
  }));
}
