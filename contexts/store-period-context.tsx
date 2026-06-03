"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { formatFiscalPeriodValue } from "@/lib/topbar-period-options";
import { 全部门店值 } from "@/lib/store-master";
import type { PeriodGranularity, ReportPeriod } from "@/lib/mock-analytics";

type StorePeriodContextValue = {
  /** `"all"`（全部门店）或 Supabase `stores.id`（UUID 字符串）；勿假定为本地 mock 的 hotel- 前缀 id */
  storeId: string;
  setStoreId: (id: string) => void;
  /** 全局顶栏固定为月度；保留字段供 KPI 环比文案等使用 */
  periodGranularity: PeriodGranularity;
  fiscalMonth: number;
  setFiscalMonth: (m: number) => void;
  fiscalYear: number;
  setFiscalYear: (y: number) => void;
  reportPeriod: ReportPeriod;
  /** 展示用账期，格式 YYYY-MM（如 2026-04） */
  periodLabel: string;
};

const StorePeriodContext = createContext<StorePeriodContextValue | null>(null);

const DEFAULT_FISCAL_YEAR = 2026;
const DEFAULT_FISCAL_MONTH = 4;

export function StorePeriodProvider({ children }: { children: React.ReactNode }) {
  const [storeId, setStoreId] = useState<string>(全部门店值);
  const [fiscalYear, setFiscalYear] = useState(DEFAULT_FISCAL_YEAR);
  const [fiscalMonth, setFiscalMonth] = useState(DEFAULT_FISCAL_MONTH);

  const periodGranularity: PeriodGranularity = "month";

  const reportPeriod = useMemo(
    (): ReportPeriod => ({
      粒度: "month",
      年: fiscalYear,
      月: fiscalMonth
    }),
    [fiscalYear, fiscalMonth]
  );

  const periodLabel = useMemo(
    () => formatFiscalPeriodValue(fiscalYear, fiscalMonth),
    [fiscalYear, fiscalMonth]
  );

  const setFiscalMonthCb = useCallback((m: number) => {
    setFiscalMonth(m);
  }, []);

  const setFiscalYearCb = useCallback((y: number) => {
    setFiscalYear(y);
  }, []);

  const value = useMemo(
    () => ({
      storeId,
      setStoreId,
      periodGranularity,
      fiscalMonth,
      setFiscalMonth: setFiscalMonthCb,
      fiscalYear,
      setFiscalYear: setFiscalYearCb,
      reportPeriod,
      periodLabel
    }),
    [
      storeId,
      fiscalMonth,
      setFiscalMonthCb,
      fiscalYear,
      setFiscalYearCb,
      reportPeriod,
      periodLabel
    ]
  );

  return <StorePeriodContext.Provider value={value}>{children}</StorePeriodContext.Provider>;
}

export function useStorePeriod() {
  const ctx = useContext(StorePeriodContext);
  if (!ctx) throw new Error("useStorePeriod 必须在 StorePeriodProvider 内使用");
  return ctx;
}
