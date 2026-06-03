"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({
  data
}: {
  data: Array<{ 周期: string; 收入: number; 成本: number; 利润: number }>;
}) {
  const safe = Array.isArray(data) && data.length > 0 ? data : [];
  if (safe.length === 0) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        暂无数据
      </div>
    );
  }
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={safe}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="周期" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="收入" stroke="#1d4ed8" strokeWidth={2.4} />
          <Line type="monotone" dataKey="成本" stroke="#f97316" strokeWidth={2.2} />
          <Line type="monotone" dataKey="利润" stroke="#059669" strokeWidth={2.2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
