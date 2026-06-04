"use client";

import { useMemo } from "react";
import { SmartChartRecommendationBadge } from "@/components/common/smart-chart-recommendation-badge";
import { FinancialTrendChart } from "@/components/charts/financial-trend-chart";
import { CockpitTrendChart } from "@/components/dashboard/cockpit-trend-chart";
import { TrendChart } from "@/components/common/trend-chart";
import { SmartChartUnsupportedNotice } from "@/components/charts/smart-chart-unsupported-notice";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { chartTypeLabelZh } from "@/lib/smart-chart/display-labels";
import { recommendSmartChart } from "@/lib/smart-chart/recommend";
import { resolveSmartChartRendererPlan } from "@/lib/smart-chart/resolve-renderer";
import type {
  SmartChartRendererFallback,
  SmartChartRendererPlan,
  SmartChartRendererProps
} from "@/lib/smart-chart/renderer-types";
import {
  categoriesToTableRows,
  seriesToDashboardTrendPoints,
  type SmartChartTableRow
} from "@/lib/smart-chart/transforms";
import type { ChartUnit } from "@/lib/smart-chart/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function useLegacyChartFallback(
  fallback: SmartChartRendererFallback,
  children: ReactNode | undefined
): children is ReactNode {
  return fallback === "legacy_children" && children != null;
}

function unitLabelZh(unit: ChartUnit): string {
  switch (unit) {
    case "yuan":
      return "元";
    case "wan_display":
      return "万元";
    case "percent":
      return "%";
    case "count":
      return "数量";
    case "currency_per_unit":
      return "元/单位";
    case "ratio_0_1":
      return "比率";
    default:
      return "元";
  }
}

function formatCellNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function SmartChartEmptyState({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
      {message ?? "暂无足够数据推荐图表。"}
    </div>
  );
}

function SmartChartMessageBlock({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
      {message}
    </p>
  );
}

function SmartChartTableFallback({ rows }: { rows: SmartChartTableRow[] }) {
  if (rows.length === 0) {
    return <SmartChartEmptyState message="暂无表格数据" />;
  }

  const hasBudget = rows.some((row) => row.budget != null);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>科目</TableHead>
            {rows.some((r) => r.group) ? <TableHead>分组</TableHead> : null}
            <TableHead>实际</TableHead>
            {hasBudget ? <TableHead>预算</TableHead> : null}
            <TableHead>单位</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              {rows.some((r) => r.group) ? (
                <TableCell className="text-muted-foreground">{row.group ?? "—"}</TableCell>
              ) : null}
              <TableCell>{formatCellNumber(row.actual)}</TableCell>
              {hasBudget ? (
                <TableCell>
                  {row.budget != null ? formatCellNumber(row.budget) : "—"}
                </TableCell>
              ) : null}
              <TableCell className="text-muted-foreground">{unitLabelZh(row.unit)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SmartChartPreviewHint({ chartLabel }: { chartLabel: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      推荐{chartLabel}。接入页面后可在此区域展示趋势图，当前为推荐说明模式。
    </p>
  );
}

function SmartChartPreviewChart({
  plan,
  payload
}: {
  plan: SmartChartRendererPlan;
  payload: SmartChartRendererProps["payload"];
}) {
  try {
    if (plan.chartType === "line") {
      const data = seriesToDashboardTrendPoints(payload.series);
      if (data.length === 0) {
        return <SmartChartEmptyState message="暂无趋势数据" />;
      }
      if (payload.lineVariant === "simple") {
        return <TrendChart data={data} />;
      }
      return <CockpitTrendChart data={data} />;
    }

    if (plan.chartType === "line_dual" && payload.financial) {
      const { rows, mode, metric } = payload.financial;
      if (!rows.length) {
        return <SmartChartEmptyState message="暂无趋势数据" />;
      }
      return <FinancialTrendChart data={rows} mode={mode} metric={metric} />;
    }

    return <SmartChartEmptyState message="暂无趋势数据" />;
  } catch {
    return (
      <SmartChartMessageBlock message="图表渲染异常，请改用表格或页面原有图表查看。" />
    );
  }
}

function SmartChartRendererBody({
  plan,
  payload,
  mode,
  fallback,
  children
}: {
  plan: SmartChartRendererPlan;
  payload: SmartChartRendererProps["payload"];
  mode: SmartChartRendererProps["mode"];
  fallback: SmartChartRendererFallback;
  children?: SmartChartRendererProps["children"];
}) {
  const chartLabel = chartTypeLabelZh(plan.chartType);
  const legacyChart = useLegacyChartFallback(fallback, children);

  if (plan.chartType === "empty" || plan.fallback === "empty") {
    if (legacyChart) return <>{children}</>;
    return <SmartChartEmptyState />;
  }

  if (plan.chartType === "none") {
    if (legacyChart) {
      return (
        <>
          <SmartChartMessageBlock message={plan.messageZh} />
          {children}
        </>
      );
    }
    return <SmartChartMessageBlock message={plan.messageZh} />;
  }

  if (!plan.supported) {
    if (legacyChart) {
      return <>{children}</>;
    }
    if (fallback === "table" && (payload.categories?.length ?? 0) > 0) {
      return <SmartChartTableFallback rows={categoriesToTableRows(payload.categories)} />;
    }
    return (
      <SmartChartUnsupportedNotice chartType={plan.chartType} messageZh={plan.messageZh} />
    );
  }

  if (plan.chartType === "table" || plan.fallback === "table") {
    if (legacyChart) return <>{children}</>;
    const rows = categoriesToTableRows(payload.categories);
    return <SmartChartTableFallback rows={rows} />;
  }

  if (plan.chartType === "line" || plan.chartType === "line_dual") {
    if (legacyChart) {
      return <>{children}</>;
    }
    if (mode === "preview" || mode === "replace") {
      return <SmartChartPreviewChart plan={plan} payload={payload} />;
    }
    return <SmartChartPreviewHint chartLabel={chartLabel} />;
  }

  if (legacyChart) {
    return <>{children}</>;
  }

  return <SmartChartMessageBlock message={plan.messageZh} />;
}

export function SmartChartRenderer({
  input,
  recommendation: recommendationProp,
  payload,
  mode = "recommendation_only",
  fallback = "message_only",
  showRecommendation = true,
  children,
  className,
  resolveOptions
}: SmartChartRendererProps) {
  const recommendation = useMemo(() => {
    if (recommendationProp) return recommendationProp;
    if (input) return recommendSmartChart(input);
    return null;
  }, [recommendationProp, input]);

  const plan = useMemo(() => {
    if (!recommendation) return null;
    return resolveSmartChartRendererPlan(recommendation, payload, resolveOptions);
  }, [recommendation, payload, resolveOptions]);

  if (!recommendation || !plan) {
    return (
      <div className={cn("space-y-3", className)}>
        <SmartChartEmptyState />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {showRecommendation ? (
        <SmartChartRecommendationBadge recommendation={recommendation} />
      ) : null}
      <SmartChartRendererBody plan={plan} payload={payload} mode={mode} fallback={fallback}>
        {children}
      </SmartChartRendererBody>
    </div>
  );
}
