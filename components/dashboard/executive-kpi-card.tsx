"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calcChange, formatPctOneDecimal, getTrendDirection, type TrendDirection } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";
import type { PeriodGranularity } from "@/lib/mock-analytics";

function deltaColor(dir: TrendDirection, invert?: boolean): string {
  if (dir === "flat") return "text-muted-foreground";
  const upGood = !invert;
  if (dir === "up") return upGood ? "text-emerald-600" : "text-red-600";
  return upGood ? "text-red-600" : "text-emerald-600";
}

function trendLabel(dir: TrendDirection, invert?: boolean): string {
  if (dir === "flat") return "持平";
  const upGood = !invert;
  if (dir === "up") return upGood ? "上涨" : "下跌";
  return upGood ? "下跌" : "上涨";
}

function DeltaRow({
  label,
  current,
  previous,
  invert
}: {
  label: string;
  current: number;
  previous: number;
  invert?: boolean;
}) {
  const pct = calcChange(current, previous);
  const dir = getTrendDirection(pct);
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return (
    <div className={cn("flex items-center justify-between text-sm leading-snug", deltaColor(dir, invert))}>
      <span className="text-muted-foreground">{label}</span>
      <span className="flex flex-wrap items-center justify-end gap-x-1 font-medium">
        {dir !== "flat" && <Icon className="h-4 w-4 shrink-0" />}
        <span>{formatPctOneDecimal(pct)}</span>
        <span className="text-muted-foreground">· {trendLabel(dir, invert)}</span>
      </span>
    </div>
  );
}

export function ExecutiveKpiCard({
  title,
  value,
  current,
  previous,
  yearAgo,
  granularity,
  invert
}: {
  title: string;
  value: string;
  current: number;
  previous: number;
  yearAgo: number;
  granularity: PeriodGranularity;
  /** 成本类指标将来可用：高为差 */
  invert?: boolean;
}) {
  const momLabel = granularity === "year" ? "较上年" : "环比";
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <DeltaRow label={momLabel} current={current} previous={previous} invert={invert} />
          <DeltaRow label="同比" current={current} previous={yearAgo} invert={invert} />
        </div>
      </CardContent>
    </Card>
  );
}
