"use client";

import type { ReportPeriod } from "@/lib/mock-analytics";
import {
  actualDataSourceLabel,
  formatActualDataPeriodHint,
  resolveActualDataSourceMode,
  type ActualDataSourceMode
} from "@/lib/actual-data-source";

type Props = {
  hasSupabaseEnv: boolean;
  loading: boolean;
  useDbActual: boolean;
  reportPeriod: ReportPeriod;
  scopeDescription: string;
  className?: string;
};

export function ActualDataSourceHint({
  hasSupabaseEnv,
  loading,
  useDbActual,
  reportPeriod,
  scopeDescription,
  className
}: Props) {
  const mode: ActualDataSourceMode = resolveActualDataSourceMode(hasSupabaseEnv, useDbActual);
  const periodHint = formatActualDataPeriodHint(reportPeriod);

  if (!hasSupabaseEnv) {
    return (
      <p className={className ?? "text-xs text-muted-foreground"}>
        实际数据来源：{actualDataSourceLabel(mode)} · {periodHint} · 范围：{scopeDescription}
      </p>
    );
  }

  if (loading) {
    return (
      <p className={className ?? "text-xs text-muted-foreground"}>
        正在从 Supabase actual_data 加载… · {periodHint} · 范围：{scopeDescription}
      </p>
    );
  }

  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      实际数据来源：{actualDataSourceLabel(mode)} · {periodHint} · store_id 范围：{scopeDescription}
    </p>
  );
}
