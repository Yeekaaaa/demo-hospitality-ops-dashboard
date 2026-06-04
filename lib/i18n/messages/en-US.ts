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
    brandTitle: "Fengtin Hospitality",
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
      companyName: "Fengtin Hotel Management Co., Ltd.",
      productName: "Hotel & F&B operations platform",
      tagline:
        "Unified hotel and restaurant operating data for leadership, finance, and store managers.",
      title: "Sign in",
      subtitle: "Enter your credentials to continue",
      accountLabel: "Account",
      accountPlaceholder: "Account",
      passwordLabel: "Password",
      passwordPlaceholder: "Password",
      remember: "Remember me",
      submit: "Sign in"
    }
  }
} as const satisfies MessageTree;
