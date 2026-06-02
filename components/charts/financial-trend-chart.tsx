"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type TrendChartMode = "实际对比预算" | "收入成本利润";

export type TrendChartMetric = "收入" | "成本" | "利润" | "出租率" | "RevPAR" | "ADR";

const METRIC_FORMAT: Record<TrendChartMetric, { suffix: string; decimals: number }> = {
  收入: { suffix: " 元", decimals: 0 },
  成本: { suffix: " 元", decimals: 0 },
  利润: { suffix: " 元", decimals: 0 },
  出租率: { suffix: "%", decimals: 1 },
  RevPAR: { suffix: " 元", decimals: 0 },
  ADR: { suffix: " 元", decimals: 0 }
};

export function FinancialTrendChart({
  data,
  mode,
  metric
}: {
  data: Array<Record<string, unknown>>;
  mode: TrendChartMode;
  metric: TrendChartMetric;
}) {
  const genericKeys = {
    actual: ["actual", "actualRevenue", "实际收入"],
    budget: ["budget", "budgetRevenue", "预算收入"]
  } as const;

  const metricKeyMap: Record<TrendChartMetric, { actual: readonly string[]; budget: readonly string[] }> = {
    收入: genericKeys,
    成本: {
      actual: ["actual", "actualCost", "实际成本"],
      budget: ["budget", "budgetCost", "预算成本"]
    },
    利润: {
      actual: ["actual", "actualProfit", "实际利润"],
      budget: ["budget", "budgetProfit", "预算利润"]
    },
    出租率: genericKeys,
    RevPAR: genericKeys,
    ADR: genericKeys
  };

  const readNumber = (obj: Record<string, unknown>, keys: readonly string[]) => {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value);
      }
    }
    return NaN;
  };

  const readMonth = (obj: Record<string, unknown>) => {
    const raw = obj.month ?? obj.月份 ?? obj.周期;
    return typeof raw === "string" ? raw : String(raw ?? "");
  };

  const chartData = data
    .map((row) => {
      const month = readMonth(row);
      const actual = readNumber(row, metricKeyMap[metric].actual);
      const budget = readNumber(row, metricKeyMap[metric].budget);
      return { month, actual, budget };
    })
    .filter((row) => row.month && Number.isFinite(row.actual) && Number.isFinite(row.budget));

  const isEmpty = chartData.length === 0;
  const actualColor = mode === "实际对比预算" ? "#2563eb" : "#0f766e";
  const budgetColor = mode === "实际对比预算" ? "#f59e0b" : "#64748b";
  const fmt = METRIC_FORMAT[metric];

  return (
    <div className="h-[320px] w-full">
      {isEmpty ? (
        <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip formatter={(v: number) => `${v.toFixed(fmt.decimals)}${fmt.suffix}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={actualColor}
              strokeWidth={2.4}
              name={`实际${metric}`}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="budget"
              stroke={budgetColor}
              strokeWidth={2.2}
              strokeDasharray="6 4"
              name={`预算${metric}`}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
