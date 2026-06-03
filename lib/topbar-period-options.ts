/** 顶栏全局经营账期：年份与月份选项（月度为主，与经营 Excel 导入一致） */

export const TOPBAR_FISCAL_YEAR_OPTIONS = [2025, 2026, 2027] as const;

export const TOPBAR_FISCAL_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function formatFiscalPeriodValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
