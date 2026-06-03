"use client";

import type { ReportPeriod } from "@/lib/mock-analytics";
import { DataSourceBanner } from "@/components/common/data-source-banner";
import type { BudgetDataHintState } from "@/lib/budget-data-source";

type Props = BudgetDataHintState & {
  reportPeriod: ReportPeriod;
  scopeDescription: string;
  queryTarget?: string;
  className?: string;
};

/** @deprecated 请使用 DataSourceBanner */
export function BudgetDataSourceHint({ reportPeriod, scopeDescription, className, queryTarget, ...state }: Props) {
  return (
    <div className={className}>
      <DataSourceBanner
        budget={{
          ...state,
          reportPeriod,
          scopeDescription
        }}
      />
      {queryTarget ? (
        <p className="mt-1 text-xs font-mono text-muted-foreground">{queryTarget}</p>
      ) : null}
    </div>
  );
}
