import type { MessageTree } from "@/lib/i18n/types";

/**
 * 默认中文字典（按 namespace 组织）
 * 页面接线前可作为文案单一来源的草案；现有组件仍保留内联中文。
 */
export const zhCNMessages = {
  locale: {
    label: "语言",
    zhCN: "中文",
    enUS: "English"
  },

  nav: {
    brandTitle: "河北沣庭酒店餐饮",
    brandSubtitle: "经营管理平台",
    expand: "展开",
    collapse: "收起",
    groups: {
      cockpit: "经营驾驶舱",
      operations: "业务运营",
      finance: "财务管理",
      execution: "执行管理",
      resources: "资源管理",
      data: "数据管理",
      system: "系统"
    },
    items: {
      dashboard: "首页总览",
      dataAnalysis: "经营增长分析",
      riskAlerts: "异常预警中心",
      hotelOperations: "酒店运营",
      restaurantOperations: "餐饮运营",
      financialReports: "财务报表",
      budgetManagement: "预算管理",
      issueTracking: "问题闭环追踪",
      storeInspection: "巡店检查表",
      approvalsWorkorders: "审批与工单",
      procurementInventory: "采购库存",
      staffScheduling: "员工与排班",
      membersCustomers: "会员与客户",
      operatingDataTemplate: "经营数据模板",
      systemSettings: "系统设置"
    }
  },

  auth: {
    login: {
      badge: "企业内部经营管理系统",
      companyName: "河北沣庭酒店管理有限公司",
      productName: "河北沣庭酒店餐饮经营管理平台",
      tagline:
        "统一管理酒店与餐饮经营数据，提升经营效率与决策能力。系统面向老板、财务、店长、餐厅经理与管理人员提供稳定、高效、可追溯的数据工作台。",
      title: "欢迎登录",
      subtitle: "请输入账号与密码进入经营管理平台",
      accountLabel: "账号",
      accountPlaceholder: "请输入账号",
      passwordLabel: "密码",
      passwordPlaceholder: "请输入密码",
      remember: "记住登录状态",
      forgotPassword: "忘记密码",
      submit: "登录系统"
    }
  },

  banner: {
    actual: {
      loading: "加载中",
      real: "真实经营数据",
      demo: "演示数据",
      realHint: "当前展示已导入的经营数据",
      demoForceHint: "该模块尚未接入经营导入，当前数字仅用于界面预览",
      demoNoEnvHint: "系统尚未连接经营数据库，导入后可查看真实经营数据",
      demoNoRowsHint: "该账期暂无真实经营数据，当前数字仅用于界面预览，请勿作为经营决策依据",
      periodScope: "账期：{period} · 范围：{scope}"
    },
    budget: {
      loading: "加载中",
      real: "真实预算数据",
      demo: "演示数据",
      hidden: "",
      noEnvHint: "系统未连接预算库，当前为演示或本机保存的预算",
      localDraftHint: "本账期无库内预算目标，当前使用本机已保存的预算草稿",
      queryErrorHint: "库内查询暂不可用，当前为演示预算",
      noTargetHint: "本账期在所选范围内暂无已录入的预算目标",
      invalidScopeHint: "当前筛选范围无效，未加载预算数据。{reason}",
      deprecatedNoEnv: "预算：演示或本地预算数据（未连接预算库）",
      deprecatedLoading: "预算：加载中",
      deprecatedInvalid: "预算：当前范围无效。{reason}",
      deprecatedQueryError: "预算：查询暂不可用，已使用演示预算",
      deprecatedReal: "预算：真实预算数据",
      deprecatedLocalDraft: "预算：本机已保存的预算草稿",
      deprecatedDemo: "预算：演示预算数据"
    },
    actualDeprecated: {
      demoFallbackLong: "演示数据（该账期暂无已导入的经营数据）",
      demoNoEnvLong: "演示数据（未连接经营数据库）"
    }
  },

  dataSource: {
    operatingActual: "经营实际数据",
    budgetData: "预算数据",
    demo: "演示数据",
    budgetLocalDraft: "预算调整",
    demoKpi: "演示",
    budgetCaliberHint:
      "经营实际数据记录已导入的经营结果；预算数据记录已保存的预算；本机预算草稿仅作演示备用，不会覆盖经营实际数据。",
    budgetSaveNoDatabase: "未连接预算数据库：已保存至本机预算草稿。",
    budgetSaveAggregateScope:
      "当前为汇总范围，未写入云端预算（请选择具体门店后再保存；汇总请用 Excel 按店导入）。",
    budgetSaveSuccess: "已保存至预算数据库，并同步本机草稿备份。",
    budgetSaveFailed: "云端保存失败：{error}（已写入本机草稿备份）。",
    budgetImportSynced: "已导入 {count} 条至预算数据。",
    budgetImportPartial: "云端同步 {success} 条成功、{fail} 条失败；已写入本机草稿。",
    budgetImportLocalOnly: "已导入至本机预算草稿。",
    connectedOperating: " · 已接入经营实际数据",
    editorHint: "优先保存至预算数据库；未连接时写入本机预算草稿"
  },

  smartChart: {
    recommendationLabel: "推荐图表：",
    reasonLabel: "原因：",
    emptyRecommendation: "暂无足够数据推荐图表。",
    previewHint: "推荐{chartType}。接入页面后可在此区域展示趋势图，当前为推荐说明模式。",
    unsupported:
      "系统推荐{chartType}，该推荐图表暂未接入自动渲染，当前可继续查看页面原有图表或表格。",
    unsupportedPlan:
      "系统推荐{chartType}，该图表类型暂未接入自动渲染，请继续查看页面原有图表或表格。",
    financialPayloadMissing: "缺少财务趋势数据，无法渲染双折线图",
    unknownChartType: "暂不支持的图表类型",
    chartType: {
      line: "折线图",
      line_dual: "实际 vs 预算折线图",
      kpi_card: "KPI 卡片",
      bar_horizontal: "横向柱状图",
      stacked_bar: "堆叠条形图",
      progress: "进度条",
      waterfall: "瀑布图",
      table: "表格",
      empty: "暂无推荐",
      none: "暂无推荐"
    },
    reason: {
      multi_period_trend: "当前为多期经营趋势，适合用折线图观察变化",
      actual_vs_budget_trend: "当前包含实际与预算，适合用双线趋势对比",
      single_period_kpi: "当前为单期核心指标，适合用 KPI 卡片展示",
      insufficient_data: "当前数据不足，暂不推荐图表",
      single_period_cost_structure: "当前为单期成本结构，适合用横向柱状图对比",
      profit_bridge: "当前为利润桥结构，适合用瀑布图展示增减",
      share_of_total: "当前为占比类指标，适合用堆叠图或进度条展示",
      too_many_categories: "明细项较多，更适合用表格查看",
      module_metric_forbidden: "当前模块不适合用该指标做图表展示",
      ambiguous_shape: "数据形态较复杂，建议先用表格查看"
    }
  },

  common: {
    loading: "加载中…",
    noData: "暂无数据",
    period: "账期"
  }
} as const satisfies MessageTree;

export type ZhCNMessages = typeof zhCNMessages;
