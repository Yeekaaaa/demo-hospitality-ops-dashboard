"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({
  data
}: {
  data: Array<{ 周期: string; 收入: number; 成本: number; 利润: number }>;
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
