/**
 * 实际 vs 预算：老板/财报通用 KPI（actual_data + budget_data / budget_overrides）
 */

import { formatPct, formatWan, type FinancialLineActual } from "@/lib/mock-analytics";

export type ActualTotals = {
  revenue: number;
  cost: number;
  profit: number;
};

export type ActualVsBudgetMetric = {
  key: string;
  标题: string;
  实际: string;
  预算: string;
  第三列标题: string;
  第三列值: string;
  趋势: "up" | "down" | "neutral";
};

function completionRate(actual: number, budget: number): number | null {
  if (budget === 0) return null;
  return actual / budget;
}

function costVariance(actual: number, budget: number): number {
  return actual - budget;
}

export function totalCostFromFinancialLine(a: FinancialLineActual): number {
  return (
    a.人力成本 +
    a.能源费用 +
    a.华住管理费 +
    a.客房服务成本 +
    a.非客房服务成本 +
    a.原材料成本
  );
}

/** 从经营科目聚合或利润表行提取实际值（万元） */
export function resolveActualTotals(
  useOperatingSubjects: boolean,
  operatingSubjects: Record<string, number>,
  financialActual: FinancialLineActual
): ActualTotals {
  if (useOperatingSubjects && Number.isFinite(operatingSubjects["营业收入"])) {
    const cost = operatingSubjects["总成本"];
    const profit = operatingSubjects["运营利润"] ?? operatingSubjects["利润"];
    return {
      revenue: operatingSubjects["营业收入"] ?? 0,
      cost: Number.isFinite(cost) ? cost! : 0,
      profit: Number.isFinite(profit) ? profit! : 0
    };
  }
  return {
    revenue: financialActual.营业收入,
    cost: totalCostFromFinancialLine(financialActual),
    profit: financialActual.营业利润
  };
}

export function resolveBudgetTotals(budgetLine: FinancialLineActual): ActualTotals {
  return {
    revenue: budgetLine.营业收入,
    cost: totalCostFromFinancialLine(budgetLine),
    profit: budgetLine.营业利润
  };
}

export function buildActualVsBudgetMetrics(
  actual: ActualTotals,
  budget: ActualTotals
): ActualVsBudgetMetric[] {
  const revRate = completionRate(actual.revenue, budget.revenue);
  const profRate = completionRate(actual.profit, budget.profit);
  const costDiff = costVariance(actual.cost, budget.cost);

  return [
    {
      key: "rev",
      标题: "实际收入",
      实际: formatWan(actual.revenue),
      预算: formatWan(budget.revenue),
      第三列标题: "收入预算完成率",
      第三列值: revRate != null ? formatPct(revRate) : "—",
      趋势: revRate != null && revRate >= 1 ? "up" : revRate != null ? "down" : "neutral"
    },
    {
      key: "cost",
      标题: "实际成本",
      实际: formatWan(actual.cost),
      预算: formatWan(budget.cost),
      第三列标题: "成本预算差异",
      第三列值: `${costDiff >= 0 ? "+" : ""}${formatWan(costDiff)}`,
      趋势: costDiff > 0 ? "down" : costDiff < 0 ? "up" : "neutral"
    },
    {
      key: "profit",
      标题: "实际利润",
      实际: formatWan(actual.profit),
      预算: formatWan(budget.profit),
      第三列标题: "利润预算完成率",
      第三列值: profRate != null ? formatPct(profRate) : "—",
      趋势: profRate != null && profRate >= 1 ? "up" : profRate != null ? "down" : "neutral"
    }
  ];
}

export type SimpleMetricCard = {
  标题: string;
  数值: string;
  变化: string;
  趋势: "up" | "down" | "neutral";
};

/** 财务报表 / 驾驶舱：九项实际 vs 预算指标卡 */
export function buildNineActualVsBudgetCards(
  actual: ActualTotals,
  budget: ActualTotals
): SimpleMetricCard[] {
  const revRate = completionRate(actual.revenue, budget.revenue);
  const profRate = completionRate(actual.profit, budget.profit);
  const costDiff = costVariance(actual.cost, budget.cost);

  return [
    {
      标题: "实际收入",
      数值: formatWan(actual.revenue),
      变化: "actual_data",
      趋势: "neutral"
    },
    {
      标题: "预算收入",
      数值: formatWan(budget.revenue),
      变化: "budget_data",
      趋势: "neutral"
    },
    {
      标题: "收入预算完成率",
      数值: revRate != null ? formatPct(revRate) : "—",
      变化: revRate != null && revRate >= 1 ? "达标" : "未达标",
      趋势: revRate != null && revRate >= 1 ? "up" : "down"
    },
    {
      标题: "实际成本",
      数值: formatWan(actual.cost),
      变化: "actual_data",
      趋势: "neutral"
    },
    {
      标题: "预算成本",
      数值: formatWan(budget.cost),
      变化: "budget_data",
      趋势: "neutral"
    },
    {
      标题: "成本预算差异",
      数值: `${costDiff >= 0 ? "+" : ""}${formatWan(costDiff)}`,
      变化: costDiff > 0 ? "超支" : "受控",
      趋势: costDiff > 0 ? "down" : "up"
    },
    {
      标题: "实际利润",
      数值: formatWan(actual.profit),
      变化: "actual_data",
      趋势: "neutral"
    },
    {
      标题: "预算利润",
      数值: formatWan(budget.profit),
      变化: "budget_data",
      趋势: "neutral"
    },
    {
      标题: "利润预算完成率",
      数值: profRate != null ? formatPct(profRate) : "—",
      变化: profRate != null && profRate >= 1 ? "达标" : "未达标",
      趋势: profRate != null && profRate >= 1 ? "up" : "down"
    }
  ];
}

export function buildVarianceAlerts(actual: ActualTotals, budget: ActualTotals): string[] {
  const alerts: string[] = [];
  const revRate = completionRate(actual.revenue, budget.revenue);
  const profRate = completionRate(actual.profit, budget.profit);
  if (revRate != null && revRate < 0.9) {
    alerts.push("收入预算完成率低于 90%，需关注价量与渠道结构。");
  }
  if (budget.cost > 0 && actual.cost > budget.cost * 1.02) {
    alerts.push("实际成本超预算 2% 以上，建议排查人力与能耗。");
  }
  if (profRate != null && profRate < 0.85) {
    alerts.push("利润预算完成率偏低，收入与成本需联动复盘。");
  }
  if (actual.profit < 0) {
    alerts.push("本期实际利润为负，请优先止损与费用管控。");
  }
  return alerts;
}
