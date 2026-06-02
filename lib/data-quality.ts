type TrendMetric = "收入" | "成本" | "利润";

type TrendRow = Record<string, unknown>;

export type QualityIssue = {
  月份: string;
  指标: TrendMetric;
  类型: "缺少实际数据" | "缺少预算数据" | "数据格式异常";
};

export function checkTrendQuality(rows: TrendRow[], metric: TrendMetric): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const keys =
    metric === "收入"
      ? { actual: ["实际收入", "actualRevenue", "actual"], budget: ["预算收入", "budgetRevenue", "budget"] }
      : metric === "成本"
        ? { actual: ["实际成本", "actualCost", "actual"], budget: ["预算成本", "budgetCost", "budget"] }
        : { actual: ["实际利润", "actualProfit", "actual"], budget: ["预算利润", "budgetProfit", "budget"] };

  const read = (row: TrendRow, cands: string[]) => {
    for (const key of cands) {
      if (key in row) return row[key];
    }
    return undefined;
  };
  const monthOf = (row: TrendRow) => String(row.周期 ?? row.month ?? row.月份 ?? "未知月份");

  for (const row of rows) {
    const 月份 = monthOf(row);
    const actualRaw = read(row, keys.actual);
    const budgetRaw = read(row, keys.budget);

    if (actualRaw === undefined || actualRaw === null || actualRaw === "") {
      issues.push({ 月份, 指标: metric, 类型: "缺少实际数据" });
    } else if (typeof actualRaw !== "number" || Number.isNaN(actualRaw)) {
      issues.push({ 月份, 指标: metric, 类型: "数据格式异常" });
    }

    if (budgetRaw === undefined || budgetRaw === null || budgetRaw === "") {
      issues.push({ 月份, 指标: metric, 类型: "缺少预算数据" });
    } else if (typeof budgetRaw !== "number" || Number.isNaN(budgetRaw)) {
      issues.push({ 月份, 指标: metric, 类型: "数据格式异常" });
    }
  }

  return issues;
}
