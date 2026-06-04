import type { MessageTree } from "@/lib/i18n/types";

/**
 * 英文字典（增量补齐；未定义 key 回退至 zh-CN）
 * 本阶段仅 scaffold，不接线页面。
 */
export const enUSMessages = {
  locale: {
    label: "Language",
    zhCN: "中文",
    enUS: "English"
  },

  nav: {
    brandTitle: "Demo Hospitality",
    brandSubtitle: "Operations Platform",
    expand: "Expand",
    collapse: "Collapse",
    groups: {
      cockpit: "Executive cockpit",
      operations: "Operations",
      finance: "Finance",
      execution: "Execution",
      resources: "Resources",
      data: "Data",
      system: "System"
    },
    items: {
      dashboard: "Dashboard",
      dataAnalysis: "Growth analysis",
      riskAlerts: "Risk alerts",
      hotelOperations: "Hotel operations",
      restaurantOperations: "Restaurant operations",
      financialReports: "Financial reports",
      budgetManagement: "Budget management",
      issueTracking: "Issue tracking",
      storeInspection: "Store inspection",
      approvalsWorkorders: "Approvals & work orders",
      procurementInventory: "Procurement & inventory",
      staffScheduling: "Staff & scheduling",
      membersCustomers: "Members & customers",
      operatingDataTemplate: "Operating data template",
      systemSettings: "Settings"
    }
  },

  auth: {
    login: {
      badge: "Internal operations platform",
      companyName: "Demo Hospitality Group Co., Ltd.",
      productName: "Demo Hotel & F&B Operations Platform",
      description:
        "Unified hotel and restaurant operating data for leadership, finance, and store managers.",
      tagline:
        "Unified hotel and restaurant operating data for leadership, finance, and store managers.",
      title: "Sign in",
      subtitle: "Enter your credentials to continue",
      accountLabel: "Account",
      accountPlaceholder: "Enter your account",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter your password",
      remember: "Remember me",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password",
      submit: "Sign in"
    }
  },

  banner: {
    actual: {
      loading: "Loading",
      real: "Imported operating data",
      demo: "Demo data",
      realHint: "Showing imported operating results",
      demoForceHint: "Demo preview only; operating import not wired for this module",
      demoNoEnvHint: "Operating database not connected; import to view real data",
      demoNoRowsHint: "No imported data for this period; figures are for preview only",
      periodScope: "Period: {period} · Scope: {scope}"
    },
    budget: {
      loading: "Loading",
      real: "Budget data",
      demo: "Demo data",
      hidden: "",
      noEnvHint: "Budget database not connected; demo or local draft in use",
      localDraftHint: "No cloud budget for this period; using local draft",
      queryErrorHint: "Budget query unavailable; showing demo budget",
      noTargetHint: "No budget targets for this period and scope",
      invalidScopeHint: "Invalid filter scope; budget not loaded. {reason}",
      deprecatedNoEnv: "Budget: demo or local (no budget database)",
      deprecatedLoading: "Budget: loading",
      deprecatedInvalid: "Budget: invalid scope. {reason}",
      deprecatedQueryError: "Budget: query unavailable; using demo budget",
      deprecatedReal: "Budget: live budget data",
      deprecatedLocalDraft: "Budget: local draft",
      deprecatedDemo: "Budget: demo budget"
    },
    actualDeprecated: {
      demoFallbackLong: "Demo data (no imported operating data for this period)",
      demoNoEnvLong: "Demo data (operating database not connected)"
    }
  },

  dataSource: {
    operatingActual: "Operating actuals",
    budgetData: "Budget",
    demo: "Demo",
    budgetLocalDraft: "Budget adjustment",
    demoKpi: "Demo",
    budgetCaliberHint:
      "Operating actuals are imported results; budget rows are saved targets; local draft is backup only.",
    budgetSaveNoDatabase: "No budget database: saved to local draft.",
    budgetSaveAggregateScope:
      "Aggregate scope: not saved to cloud (pick a store or import per store via Excel).",
    budgetSaveSuccess: "Saved to budget database with local draft backup.",
    budgetSaveFailed: "Cloud save failed: {error} (local draft saved).",
    budgetImportSynced: "Imported {count} rows to budget data.",
    budgetImportPartial: "Synced {success} ok, {fail} failed; local draft updated.",
    budgetImportLocalOnly: "Imported to local budget draft only.",
    connectedOperating: " · Operating actuals connected",
    editorHint: "Saves to budget database when connected; otherwise local draft"
  },

  smartChart: {
    recommendationLabel: "Recommended chart: ",
    reasonLabel: "Reason: ",
    emptyRecommendation: "Not enough data to recommend a chart.",
    previewHint:
      "Recommended {chartType}. Trend chart can render here when wired; preview mode for now.",
    unsupported:
      "Recommends {chartType}; auto-render not available yet—use the existing chart or table.",
    unsupportedPlan:
      "Recommends {chartType}; this chart type is not wired for auto-render—use existing views.",
    financialPayloadMissing: "Missing financial trend payload for dual-line chart",
    unknownChartType: "Chart type not supported yet",
    chartType: {
      line: "Line chart",
      line_dual: "Actual vs budget lines",
      kpi_card: "KPI card",
      bar_horizontal: "Horizontal bar",
      stacked_bar: "Stacked bar",
      progress: "Progress",
      waterfall: "Waterfall",
      table: "Table",
      empty: "No recommendation",
      none: "No recommendation"
    },
    reason: {
      multi_period_trend: "Multi-period trend suits a line chart",
      actual_vs_budget_trend: "Actual and budget series suit a dual-line comparison",
      single_period_kpi: "Single-period KPI suits a KPI card",
      insufficient_data: "Insufficient data for a chart recommendation",
      single_period_cost_structure: "Cost structure suits a horizontal bar chart",
      profit_bridge: "Profit bridge suits a waterfall chart",
      share_of_total: "Share metrics suit stacked bar or progress",
      too_many_categories: "Many line items—use a table",
      module_metric_forbidden: "Metric not allowed for charts in this module",
      ambiguous_shape: "Complex shape—start with a table"
    }
  },

  dashboard: {
    pageTitle: "Executive Dashboard",
    periodLine: "{scope} · Period {period} · {scopeShort} ({scopeDetail})",
    exportBrief: "Export Executive Brief",
    scopeAllStores: "All Stores",
    scopeHotelBoard: "Hotel Board",
    scopeRestaurantBoard: "Restaurant Board",
    scopeSegmentHotel: "hotel segment",
    scopeSegmentRestaurant: "restaurant segment",
    scopeSegmentOperating: "operating stores",
    scopeMultiStores: "{count} stores ({segment})",
    activeScopeShort: "demo city operating stores",
    activeScopeDetail: "Demo Hotel A, Demo Hotel B, Demo Hotel C, Demo Restaurant",
    sectionCurrentPerformance: "Current Period Performance",
    totalRevenue: "Total Revenue",
    totalProfit: "Total Profit",
    profitMargin: "Profit Margin",
    occupancyRate: "Occupancy Rate",
    vsBudgetTitle: "Actual vs Budget",
    vsBudgetSubtitle: "Compared to budget targets for this period ({version})",
    varianceAlertsTitle: "Variance Alerts",
    trendTitle: "Revenue / Cost / Profit Trend (Last 6 Periods)",
    demoSummaryTitle: "Demo Summary (UI example, not imported operating data)",
    demoRestaurantNote:
      "Demo Restaurant: 3 condiment batches near expiry—prioritize outbound use.",
    demoHotelNote:
      "Demo Hotel A: linen below safety stock—replenishment suggestion generated.",
    demoApprovalsNote:
      "Pending approvals: 2 expense reports, 2 purchase requests, 1 leave request—expected today.",
    budgetVersionBase: "Baseline",
    budgetVersionOptimistic: "Optimistic",
    budgetVersionConservative: "Conservative",
    metrics: {
      actualRevenue: "Actual Revenue",
      budgetRevenue: "Budget Revenue",
      revenueCompletion: "Revenue Budget Completion",
      actualCost: "Actual Cost",
      budgetCost: "Budget Cost",
      costVariance: "Cost Budget Variance",
      actualProfit: "Actual Profit",
      budgetProfit: "Budget Profit",
      profitCompletion: "Profit Budget Completion"
    },
    status: {
      onTrack: "On track",
      offTrack: "Off track",
      overBudget: "Over budget",
      controlled: "Controlled"
    },
    variance: {
      revenueBelow90:
        "Revenue budget completion is below 90%—review pricing, volume, and channels.",
      costOver2Pct: "Actual cost exceeds budget by more than 2%—review labor and utilities.",
      profitCompletionLow:
        "Profit budget completion is low—review revenue and cost together.",
      profitNegative: "Actual profit is negative this period—prioritize loss control and spend."
    }
  },

  common: {
    loading: "Loading…",
    noData: "No data",
    period: "Period"
  }
} as const satisfies MessageTree;
