"use client";

import { Info } from "lucide-react";
import type { ReportPeriod } from "@/lib/mock-analytics";
import {
  actualBannerUsesDemoTone,
  buildActualBannerLine,
  formatReportPeriodLabel,
  resolveActualBannerTone,
  type ActualBannerTone
} from "@/lib/actual-data-source";
import {
  buildBudgetBannerLine,
  budgetBannerUsesDemoTone,
  resolveBudgetBannerTone,
  type BudgetDataHintState,
  type BudgetBannerTone
} from "@/lib/budget-data-source";
import { cn } from "@/lib/utils";

export type ActualBannerInput = {
  hasSupabaseEnv: boolean;
  loading: boolean;
  useDbActual: boolean;
  reportPeriod: ReportPeriod;
  scopeDescription: string;
  /** 餐饮等固定演示模块 */
  forceDemo?: boolean;
};

type BannerLine = {
  key: string;
  label?: string;
  text: string;
  tone: ActualBannerTone | BudgetBannerTone;
};

function lineToneClass(tone: ActualBannerTone | BudgetBannerTone): string {
  if (tone === "loading") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }
  if (tone === "real") {
    return "border-emerald-200 bg-emerald-50/90 text-emerald-950";
  }
  if (tone === "demo" || tone === "hidden") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  return "border-slate-200 bg-muted/50 text-muted-foreground";
}

function isDemoTone(tone: ActualBannerTone | BudgetBannerTone): boolean {
  return tone === "demo" || tone === "hidden";
}

type Props = {
  actual?: ActualBannerInput;
  budget?: BudgetDataHintState & {
    reportPeriod: ReportPeriod;
    scopeDescription: string;
  };
  className?: string;
};

export function DataSourceBanner({ actual, budget, className }: Props) {
  const lines: BannerLine[] = [];

  if (actual) {
    const periodLabel = formatReportPeriodLabel(actual.reportPeriod);
    const tone = resolveActualBannerTone(actual);
    const withBudget = Boolean(budget);
    const text = buildActualBannerLine({
      tone,
      periodLabel,
      scopeDescription: actual.scopeDescription,
      forceDemo: actual.forceDemo,
      hasSupabaseEnv: actual.hasSupabaseEnv,
      compact: withBudget && !actual.forceDemo
    });
    lines.push({
      key: "actual",
      label: actual.forceDemo ? undefined : withBudget ? "实际" : undefined,
      text,
      tone
    });
  }

  if (budget) {
    const tone = resolveBudgetBannerTone(budget);
    const text = buildBudgetBannerLine(budget, budget.reportPeriod, budget.scopeDescription);
    if (text) {
      lines.push({
        key: "budget",
        label: "预算",
        text,
        tone: tone === "hidden" ? "demo" : tone
      });
    }
  }

  if (lines.length === 0) return null;

  const anyDemo = lines.some((l) => {
    if (l.key === "actual") {
      return actualBannerUsesDemoTone(l.tone as ActualBannerTone, actual?.hasSupabaseEnv ?? false);
    }
    return budgetBannerUsesDemoTone(l.tone as BudgetBannerTone);
  });
  const anyLoading = lines.some((l) => l.tone === "loading");
  const containerTone: ActualBannerTone | BudgetBannerTone = anyLoading
    ? "loading"
    : anyDemo
      ? "demo"
      : "real";

  return (
    <div
      role="status"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        lineToneClass(containerTone),
        className
      )}
    >
      <div className="flex gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <div className="min-w-0 space-y-1.5">
          {lines.map((line) => (
            <p key={line.key} className="leading-snug">
              {line.label ? (
                <span className="font-medium">
                  {line.label}：
                  {isDemoTone(line.tone) ? "" : " "}
                </span>
              ) : null}
              <span className={line.label ? undefined : "font-medium"}>{line.text}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
