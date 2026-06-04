/**
 * 指标卡 / 数据来源等用户可见标签（内部常量勿直接渲染）
 */

import { t } from "@/lib/i18n/get-message";

/** MetricCard「变化」等字段的内部取值 */
export const METRIC_SOURCE_TAG = {
  operatingActual: "operating_actual",
  budgetTarget: "budget_target",
  demo: "demo",
  budgetLocalDraft: "budget_local_draft",
  /** 财报 KPI 行演示标记 */
  demoKpi: "demo_kpi"
} as const;

const LEGACY_SOURCE_ALIASES: Record<string, string> = {
  actual_data: METRIC_SOURCE_TAG.operatingActual,
  budget_data: METRIC_SOURCE_TAG.budgetTarget,
  "mock demo": METRIC_SOURCE_TAG.demo,
  budget_overrides: METRIC_SOURCE_TAG.budgetLocalDraft,
  演示: METRIC_SOURCE_TAG.demoKpi
};

const SOURCE_I18N_KEY: Record<string, string> = {
  [METRIC_SOURCE_TAG.operatingActual]: "dataSource.operatingActual",
  [METRIC_SOURCE_TAG.budgetTarget]: "dataSource.budgetData",
  [METRIC_SOURCE_TAG.demo]: "dataSource.demo",
  [METRIC_SOURCE_TAG.budgetLocalDraft]: "dataSource.budgetLocalDraft",
  [METRIC_SOURCE_TAG.demoKpi]: "dataSource.demoKpi"
};

/** 将内部来源标记转为用户可见中文 */
export function formatMetricSourceLabel(source: string): string {
  const key = LEGACY_SOURCE_ALIASES[source] ?? source;
  const messageKey = SOURCE_I18N_KEY[key];
  return messageKey ? t(messageKey) : source;
}

/** 预算管理页：数据口径说明（用户可见） */
export const BUDGET_DATA_CALIBER_USER_HINT = t("dataSource.budgetCaliberHint");

export function budgetSaveStatusNoDatabase(): string {
  return t("dataSource.budgetSaveNoDatabase");
}

export function budgetSaveStatusAggregateScope(): string {
  return t("dataSource.budgetSaveAggregateScope");
}

export function budgetSaveStatusSavedToDatabase(): string {
  return t("dataSource.budgetSaveSuccess");
}

export function budgetSaveStatusDatabaseWriteFailed(error: string): string {
  return t("dataSource.budgetSaveFailed", { error });
}

export function budgetImportStatusSynced(successCount: number): string {
  return t("dataSource.budgetImportSynced", { count: successCount });
}

export function budgetImportStatusPartialSync(successCount: number, failCount: number): string {
  return t("dataSource.budgetImportPartial", {
    success: successCount,
    fail: failCount
  });
}

export function budgetImportStatusLocalOnly(): string {
  return t("dataSource.budgetImportLocalOnly");
}
