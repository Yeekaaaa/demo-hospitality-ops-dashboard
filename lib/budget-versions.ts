/**
 * 预算版本体系（全系统统一）— 经营情景对比
 */

export type BudgetVersionValue = "base" | "optimistic" | "conservative";

export type BudgetVersionOption = {
  value: BudgetVersionValue;
  label: string;
  description: string;
};

export const BUDGET_VERSION_OPTIONS: BudgetVersionOption[] = [
  {
    value: "base",
    label: "基准版",
    description: "常规经营计划与月度对标，默认版本。"
  },
  {
    value: "optimistic",
    label: "乐观版",
    description: "收入与利润目标偏进取，用于上行情景测算。"
  },
  {
    value: "conservative",
    label: "保守版",
    description: "成本与风险假设偏审慎，用于压力测试与下行预案。"
  }
];

export const DEFAULT_BUDGET_VERSION: BudgetVersionValue = "base";

const LEGACY_MAP: Record<string, BudgetVersionValue> = {
  base: "base",
  optimistic: "optimistic",
  conservative: "conservative",
  基准版: "base",
  乐观版: "optimistic",
  保守版: "conservative",
  monthly_execution: "base",
  annual_target: "base",
  rolling_forecast: "optimistic",
  owner_approved: "conservative",
  月度执行版: "base",
  年度目标版: "base",
  调整预测版: "optimistic",
  老板确认版: "conservative",
  老板版预算: "conservative",
  老板预算: "conservative",
  boss: "conservative",
  owner: "conservative",
  默认预算: "base",
  default: "base"
};

export function normalizeBudgetVersion(input: string | null | undefined): BudgetVersionValue {
  const raw = (input ?? "").trim();
  if (!raw) return DEFAULT_BUDGET_VERSION;
  const key = raw.replace(/\s/g, "");
  const hit = LEGACY_MAP[key] ?? LEGACY_MAP[raw];
  if (hit) return hit;
  const byValue = BUDGET_VERSION_OPTIONS.find((o) => o.value === raw);
  if (byValue) return byValue.value;
  return DEFAULT_BUDGET_VERSION;
}

export function getBudgetVersionLabel(value: string | null | undefined): string {
  const v = normalizeBudgetVersion(value);
  return BUDGET_VERSION_OPTIONS.find((o) => o.value === v)?.label ?? "基准版";
}

export function getBudgetVersionDescription(value: string | null | undefined): string {
  const v = normalizeBudgetVersion(value);
  return BUDGET_VERSION_OPTIONS.find((o) => o.value === v)?.description ?? "";
}
