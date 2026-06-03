"use client";

import type { ReportPeriod } from "@/lib/mock-analytics";
import { DataSourceBanner } from "@/components/common/data-source-banner";

type Props = {
  hasSupabaseEnv: boolean;
  loading: boolean;
  useDbActual: boolean;
  reportPeriod: ReportPeriod;
  scopeDescription: string;
  className?: string;
};

/** @deprecated 请使用 DataSourceBanner */
export function ActualDataSourceHint(props: Props) {
  return (
    <DataSourceBanner
      className={props.className}
      actual={{
        hasSupabaseEnv: props.hasSupabaseEnv,
        loading: props.loading,
        useDbActual: props.useDbActual,
        reportPeriod: props.reportPeriod,
        scopeDescription: props.scopeDescription
      }}
    />
  );
}
