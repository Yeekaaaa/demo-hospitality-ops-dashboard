"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { aggregateActualDataRowsToOperatingSubjects } from "@/lib/actual-data-subject-bridge";
import { mapOperatingSubjectsToBudgetLabels } from "@/lib/operating-budget-subjects";
import type { ReportPeriod } from "@/lib/mock-analytics";
import { 全部门店值 } from "@/lib/store-master";
import {
  getActualDataRowsForPeriodWithStores,
  type ActualDataStoreScope,
  type ActualDataRowWithStore
} from "@/src/lib/dashboard-data-service";

type ActualDataSupabaseContextValue = {
  rows: ActualDataRowWithStore[];
  operatingSubjects: Record<string, number>;
  budgetLabelSubjects: Record<string, number>;
  loading: boolean;
  hasSupabaseEnv: boolean;
  /** 当前账期在 actual_data 中已有行（优先于 mock） */
  hasDbRows: boolean;
  refresh: () => void;
};

const ActualDataSupabaseContext = createContext<ActualDataSupabaseContextValue | null>(null);

export function ActualDataSupabaseProvider({
  storeId,
  reportPeriod,
  children
}: {
  storeId: string;
  reportPeriod: ReportPeriod;
  children: ReactNode;
}) {
  const [rows, setRows] = useState<ActualDataRowWithStore[]>([]);
  const [loading, setLoading] = useState(false);

  const hasSupabaseEnv = useMemo(
    () =>
      Boolean(
        typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
          typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
      ),
    []
  );

  const load = useCallback(async () => {
    if (!hasSupabaseEnv) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getActualDataRowsForPeriodWithStores(reportPeriod, storeId);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [hasSupabaseEnv, reportPeriod, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const operatingSubjects = useMemo(
    () => aggregateActualDataRowsToOperatingSubjects(rows as Record<string, unknown>[]),
    [rows]
  );

  const budgetLabelSubjects = useMemo(
    () => mapOperatingSubjectsToBudgetLabels(operatingSubjects),
    [operatingSubjects]
  );

  const value = useMemo(
    () => ({
      rows,
      operatingSubjects,
      budgetLabelSubjects,
      loading,
      hasSupabaseEnv,
      hasDbRows: rows.length > 0,
      refresh: () => {
        void load();
      }
    }),
    [rows, operatingSubjects, budgetLabelSubjects, loading, hasSupabaseEnv, load]
  );

  return <ActualDataSupabaseContext.Provider value={value}>{children}</ActualDataSupabaseContext.Provider>;
}

export function useActualDataSupabase(): ActualDataSupabaseContextValue {
  const ctx = useContext(ActualDataSupabaseContext);
  if (!ctx) {
    return {
      rows: [],
      operatingSubjects: {},
      budgetLabelSubjects: {},
      loading: false,
      hasSupabaseEnv: false,
      hasDbRows: false,
      refresh: () => {}
    };
  }
  return ctx;
}

/** 按门店范围拉取 actual_data（单店 UUID / 多店 in / 全部门店） */
export function useActualDataSupabaseForScope(
  storeScope: ActualDataStoreScope,
  reportPeriod: ReportPeriod
): ActualDataSupabaseContextValue {
  const [rows, setRows] = useState<ActualDataRowWithStore[]>([]);
  const [loading, setLoading] = useState(false);

  const hasSupabaseEnv = useMemo(
    () =>
      Boolean(
        typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
          typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
      ),
    []
  );

  const scopeKey =
    storeScope === 全部门店值
      ? "all"
      : Array.isArray(storeScope)
        ? storeScope.join(",")
        : storeScope;

  const load = useCallback(async () => {
    if (!hasSupabaseEnv) {
      setRows([]);
      return;
    }
    if (Array.isArray(storeScope) && storeScope.length === 0) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getActualDataRowsForPeriodWithStores(reportPeriod, storeScope);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [hasSupabaseEnv, reportPeriod, scopeKey, storeScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const operatingSubjects = useMemo(
    () => aggregateActualDataRowsToOperatingSubjects(rows as Record<string, unknown>[]),
    [rows]
  );

  const budgetLabelSubjects = useMemo(
    () => mapOperatingSubjectsToBudgetLabels(operatingSubjects),
    [operatingSubjects]
  );

  return useMemo(
    () => ({
      rows,
      operatingSubjects,
      budgetLabelSubjects,
      loading,
      hasSupabaseEnv,
      hasDbRows: rows.length > 0,
      refresh: () => {
        void load();
      }
    }),
    [rows, operatingSubjects, budgetLabelSubjects, loading, hasSupabaseEnv, load]
  );
}

/** @deprecated 请用 useActualDataSupabaseForScope；保留给仍传 storeId 数组的页面 */
export function useActualDataSupabaseForStoreIds(
  storeIds: string[],
  reportPeriod: ReportPeriod
): ActualDataSupabaseContextValue {
  const storeScope = useMemo((): ActualDataStoreScope => {
    if (storeIds.length === 0) return [];
    if (storeIds.length === 1) return storeIds[0]!;
    return storeIds;
  }, [storeIds]);
  return useActualDataSupabaseForScope(storeScope, reportPeriod);
}

export type ActualDataSupabaseSnapshot = ReturnType<typeof useActualDataSupabaseForScope>;

export { 全部门店值 };
