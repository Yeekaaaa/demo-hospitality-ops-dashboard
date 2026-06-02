"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { 全部门店值 } from "@/lib/store-master";
import type { PeriodGranularity, ReportPeriod } from "@/lib/mock-analytics";

type StorePeriodContextValue = {
  /** `"all"`（全部门店）或 Supabase `stores.id`（UUID 字符串）；勿假定为本地 mock 的 hotel- 前缀 id */
  storeId: string;
  setStoreId: (id: string) => void;
  periodGranularity: PeriodGranularity;
  setPeriodGranularity: (g: PeriodGranularity) => void;
  /** 粒度为 month 时有效，演示用 1–12 */
  fiscalMonth: number;
  setFiscalMonth: (m: number) => void;
  /** 粒度为 quarter 时有效 1–4 */
  fiscalQuarter: number;
  setFiscalQuarter: (q: number) => void;
  fiscalYear: number;
  setFiscalYear: (y: number) => void;
  reportPeriod: ReportPeriod;
  periodLabel: string;
};

const StorePeriodContext = createContext<StorePeriodContextValue | null>(null);

export function StorePeriodProvider({ children }: { children: React.ReactNode }) {
  const [storeId, setStoreId] = useState<string>(全部门店值);
  const [periodGranularity, setPeriodGranularity] = useState<PeriodGranularity>("month");
  const [fiscalYear, setFiscalYear] = useState(2026);
  const [fiscalMonth, setFiscalMonth] = useState(4);
  const [fiscalQuarter, setFiscalQuarter] = useState(2);

  const reportPeriod = useMemo((): ReportPeriod => {
    if (periodGranularity === "month") {
      return { 粒度: "month", 年: fiscalYear, 月: fiscalMonth };
    }
    if (periodGranularity === "quarter") {
      return { 粒度: "quarter", 年: fiscalYear, 季: fiscalQuarter };
    }
    return { 粒度: "year", 年: fiscalYear };
  }, [periodGranularity, fiscalYear, fiscalMonth, fiscalQuarter]);

  const periodLabel = useMemo(() => {
    if (periodGranularity === "month") return `${fiscalYear} 年 ${fiscalMonth} 月`;
    if (periodGranularity === "quarter") return `${fiscalYear} 年第 ${fiscalQuarter} 季度`;
    return `${fiscalYear} 年度`;
  }, [periodGranularity, fiscalYear, fiscalMonth, fiscalQuarter]);

  const setPeriodGranularityCb = useCallback((g: PeriodGranularity) => {
    setPeriodGranularity(g);
  }, []);

  const value = useMemo(
    () => ({
      storeId,
      setStoreId,
      periodGranularity,
      setPeriodGranularity: setPeriodGranularityCb,
      fiscalMonth,
      setFiscalMonth,
      fiscalQuarter,
      setFiscalQuarter,
      fiscalYear,
      setFiscalYear,
      reportPeriod,
      periodLabel
    }),
    [
      storeId,
      periodGranularity,
      setPeriodGranularityCb,
      fiscalMonth,
      fiscalQuarter,
      fiscalYear,
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
