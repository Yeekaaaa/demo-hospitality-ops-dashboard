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
import type { DashboardTrendPoint } from "@/src/lib/dashboard-data-service";

export function CockpitTrendChart({ data }: { data: DashboardTrendPoint[] }) {
  const safe = Array.isArray(data) && data.length > 0 ? data : [{ 周期: "—", 收入: 0, 成本: 0, 利润: 0 }];
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={safe}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="周期" stroke="#64748b" tick={{ fontSize: 13 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 13 }} tickFormatter={(v) => `${v}`} />
          <Tooltip
            formatter={(value: number | string, name: string) => [
              `¥ ${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} 万`,
              name
            ]}
            labelFormatter={(l) => `账期 ${l}`}
            contentStyle={{ fontSize: 14 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Line type="monotone" dataKey="收入" stroke="#1d4ed8" strokeWidth={2.2} dot={false} />
          <Line type="monotone" dataKey="成本" stroke="#ea580c" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="利润" stroke="#059669" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
