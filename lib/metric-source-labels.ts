/**
 * 指标卡 / 数据来源等用户可见标签（内部常量勿直接渲染）
 */

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

const SOURCE_LABEL_ZH: Record<string, string> = {
  [METRIC_SOURCE_TAG.operatingActual]: "经营实际数据",
  [METRIC_SOURCE_TAG.budgetTarget]: "预算数据",
  [METRIC_SOURCE_TAG.demo]: "演示数据",
  [METRIC_SOURCE_TAG.budgetLocalDraft]: "预算调整",
  [METRIC_SOURCE_TAG.demoKpi]: "演示"
};

/** 将内部来源标记转为用户可见中文 */
export function formatMetricSourceLabel(source: string): string {
  const key = LEGACY_SOURCE_ALIASES[source] ?? source;
  return SOURCE_LABEL_ZH[key] ?? source;
}

/** 预算管理页：数据口径说明（用户可见） */
export const BUDGET_DATA_CALIBER_USER_HINT =
  "经营实际数据记录已导入的经营结果；预算数据记录已保存的预算；本机预算草稿仅作演示备用，不会覆盖经营实际数据。";

export function budgetSaveStatusNoDatabase(): string {
  return "未连接预算数据库：已保存至本机预算草稿。";
}

export function budgetSaveStatusAggregateScope(): string {
  return "当前为汇总范围，未写入云端预算（请选择具体门店后再保存；汇总请用 Excel 按店导入）。";
}

export function budgetSaveStatusSavedToDatabase(): string {
  return "已保存至预算数据库，并同步本机草稿备份。";
}

export function budgetSaveStatusDatabaseWriteFailed(error: string): string {
  return `云端保存失败：${error}（已写入本机草稿备份）。`;
}

export function budgetImportStatusSynced(successCount: number): string {
  return `已导入 ${successCount} 条至预算数据。`;
}

export function budgetImportStatusPartialSync(successCount: number, failCount: number): string {
  return `云端同步 ${successCount} 条成功、${failCount} 条失败；已写入本机草稿。`;
}

export function budgetImportStatusLocalOnly(): string {
  return "已导入至本机预算草稿。";
}
