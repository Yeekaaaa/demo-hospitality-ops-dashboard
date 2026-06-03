"use client";

import type { ReportPeriod } from "@/lib/mock-analytics";
import {
  buildActualBannerDisplay,
  formatReportPeriodLabel,
  resolveActualBannerTone,
  type ActualBannerTone
} from "@/lib/actual-data-source";
import {
  buildBudgetBannerDisplay,
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

type BannerRow = {
  key: string;
  badge: string;
  meta: string;
  hint?: string;
  tone: ActualBannerTone | BudgetBannerTone;
};

function rowToneClass(tone: ActualBannerTone | BudgetBannerTone): string {
  if (tone === "loading") {
    return "border-slate-200/90 bg-slate-50 text-slate-800";
  }
  if (tone === "real") {
    return "border-emerald-200/90 bg-emerald-50/80 text-emerald-950";
  }
  return "border-amber-200/90 bg-amber-50/90 text-amber-950";
}

function badgeToneClass(tone: ActualBannerTone | BudgetBannerTone): string {
  if (tone === "loading") {
    return "bg-slate-200/80 text-slate-800";
  }
  if (tone === "real") {
    return "bg-emerald-100 text-emerald-900";
  }
  return "bg-amber-100 text-amber-900";
}

type Props = {
  actual?: ActualBannerInput;
  budget?: BudgetDataHintState & {
    reportPeriod: ReportPeriod;
    scopeDescription: string;
  };
  className?: string;
};

function BannerRowBlock({ row }: { row: BannerRow }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm leading-snug",
        rowToneClass(row.tone)
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded px-2 py-0.5 text-xs font-semibold tracking-wide",
          badgeToneClass(row.tone)
        )}
      >
        {row.badge}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium">{row.meta}</p>
        {row.hint ? <p className="text-xs leading-snug opacity-90">{row.hint}</p> : null}
      </div>
    </div>
  );
}

export function DataSourceBanner({ actual, budget, className }: Props) {
  const rows: BannerRow[] = [];

  if (actual) {
    const periodLabel = formatReportPeriodLabel(actual.reportPeriod);
    const tone = resolveActualBannerTone(actual);
    const withBudget = Boolean(budget);
    const display = buildActualBannerDisplay({
      tone,
      periodLabel,
      scopeDescription: actual.scopeDescription,
      forceDemo: actual.forceDemo,
      hasSupabaseEnv: actual.hasSupabaseEnv,
      compact: withBudget && !actual.forceDemo
    });
    rows.push({
      key: "actual",
      badge: display.badge,
      meta: display.meta,
      hint: display.hint,
      tone
    });
  }

  if (budget) {
    const tone = resolveBudgetBannerTone(budget);
    const display = buildBudgetBannerDisplay(
      budget,
      budget.reportPeriod,
      budget.scopeDescription
    );
    if (display) {
      rows.push({
        key: "budget",
        badge: display.badge,
        meta: display.meta,
        hint: display.hint,
        tone: tone === "hidden" ? "demo" : tone
      });
    }
  }

  if (rows.length === 0) return null;

  return (
    <div role="status" className={cn("space-y-1.5", className)} aria-live="polite">
      {rows.map((row) => (
        <BannerRowBlock key={row.key} row={row} />
      ))}
    </div>
  );
}
