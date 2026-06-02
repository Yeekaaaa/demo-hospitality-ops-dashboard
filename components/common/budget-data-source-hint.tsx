"use client";

import type { ReportPeriod } from "@/lib/mock-analytics";
import {
  buildBudgetDataSourceMessage,
  type BudgetDataHintState
} from "@/lib/budget-data-source";
import { formatActualDataPeriodHint } from "@/lib/actual-data-source";

type Props = BudgetDataHintState & {
  reportPeriod: ReportPeriod;
  scopeDescription: string;
  queryTarget?: string;
  className?: string;
};

export function BudgetDataSourceHint({
  reportPeriod,
  scopeDescription,
  queryTarget,
  className,
  ...state
}: Props) {
  const periodHint = formatActualDataPeriodHint(reportPeriod);
  const sourceText = buildBudgetDataSourceMessage(state);
  const tone =
    state.queryError || state.scopeMode === "invalid"
      ? "text-amber-800"
      : state.useDbBudget
        ? "text-emerald-800"
        : "text-muted-foreground";

  return (
    <div className={className ?? "space-y-0.5"}>
      <p className={`text-xs ${tone}`}>
        {sourceText} · {periodHint}
      </p>
      <p className="text-xs text-muted-foreground">预算查询范围：{scopeDescription}</p>
      {queryTarget ? (
        <p className="text-xs font-mono text-muted-foreground">{queryTarget}</p>
      ) : null}
    </div>
  );
}
