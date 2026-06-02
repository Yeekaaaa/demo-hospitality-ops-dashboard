/**
 * 全系统数据口径约定（actual_data vs 预算数据源）
 *
 * 【单一事实来源】本文件与 docs/data-caliber-freeze.md 共同定义系统口径。
 * 修改 actual_data / budget_data 字段含义、落库目标或 KPI 计算前，
 * 必须先同步更新 docs/data-caliber-freeze.md，再改代码。
 *
 * 冻结要点：
 * - actual_data = 实际经营结果；budget_data = 预算目标
 * - budget_overrides = 本地演示 fallback，不覆盖 actual_data
 * - 经营 Excel 只写 actual_data；预算管理只写 budget_data
 */

import type { ReportPeriod } from "@/lib/mock-analytics";
import { reportPeriodToActualDataPeriod } from "@/src/lib/dashboard-data-service";

/** 经营 Excel 导入唯一落库表 */
export const ACTUAL_DATA_TABLE = "actual_data" as const;

/** Supabase 预算目标表 */
export const BUDGET_DATA_TABLE = "budget_data" as const;

/** 无 Supabase / 无库内预算时的浏览器 fallback */
export const BUDGET_DATA_STORAGE_KEY = "fengtin_budget_overrides_v2" as const;

export const DATA_CALIBER_RULES = {
  operatingImportTarget: "仅写入 actual_data，表示实际经营结果",
  budgetManagementTarget: "优先写入 Supabase budget_data；无环境时写入 budget_overrides",
  noBudgetInActualData: "禁止将预算科目或预算版本写入 actual_data",
  actualDataMeaning: "actual_data = 实际经营结果",
  budgetDataMeaning: "budget_data = 预算目标（计划）",
  budgetOverridesMeaning: "budget_overrides = 本地演示 fallback，不得覆盖 actual_data",
  bossBudgetCore:
    "总营业收入 / 总营业成本 / 经营利润 = 老板核心财务口径；可售房间数 / 已售房间数 / ADR / RevPAR = 酒店运营口径",
  financialReportsRead: "同时读取 actual_data（实际）与 budget_data（预算，fallback budget_overrides）",
  dashboardRead: "actual_data 为实际；budget_data 为预算目标（fallback budget_overrides）",
  hotelOpsRead: "以 actual_data 为主；预算仅用于完成率对比，不作为经营数据来源"
} as const;

/** 统一账期编码（与 Supabase actual_data.period_type / period_value 一致） */
export function toDbPeriod(reportPeriod: ReportPeriod): {
  period_type: string;
  period_value: string;
} {
  return reportPeriodToActualDataPeriod(reportPeriod);
}
