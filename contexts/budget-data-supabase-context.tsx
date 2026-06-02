"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveBudgetFinancialLine, type BudgetSourceMode } from "@/lib/budget-resolve";
import type { BudgetScopeResolution } from "@/lib/budget-scope";
import type { BudgetOverrideMap } from "@/lib/budget-overrides";
import { DEFAULT_BUDGET_VERSION, type BudgetVersionValue } from "@/lib/budget-versions";
import type { FinancialLineActual, ReportPeriod } from "@/lib/mock-analytics";
import { budgetDataRowsToCanonicalSubjectMap } from "@/lib/budget-canonical";
import {
  aggregateBudgetDataRows,
  getBudgetDataByScopeAndPeriod,
  hasSupabaseBudgetEnv,
  type BudgetDataRow
} from "@/src/lib/budget-data-service";

export type UseBudgetDataResult = {
  budgetLine: FinancialLineActual;
  budgetSubjects: Record<string, number>;
  loading: boolean;
  hasSupabaseEnv: boolean;
  hasDbRows: boolean;
  useDbBudget: boolean;
  budgetSource: BudgetSourceMode;
  scopeResolution: BudgetScopeResolution;
  queryError: string | null;
  rowCount: number;
  refresh: () => void;
};

type Options = {
  scopeResolution: BudgetScopeResolution;
  mockFallbackScope: string;
  overrides?: BudgetOverrideMap;
  budgetVersion?: BudgetVersionValue;
};

/**
 * 按 resolveBudgetScopeForFilter 的 queryScope 读取 budget_data
 */
export function useBudgetDataForScope(
  reportPeriod: ReportPeriod,
  options: Options
): UseBudgetDataResult {
  const {
    scopeResolution,
    mockFallbackScope,
    overrides,
    budgetVersion = DEFAULT_BUDGET_VERSION
  } = options;

  const [rows, setRows] = useState<BudgetDataRow[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasSupabaseEnv = useMemo(() => hasSupabaseBudgetEnv(), []);

  const scopeKey =
    scopeResolution.mode === "single"
      ? scopeResolution.singleStoreId ?? "invalid"
      : scopeResolution.mode === "aggregate"
        ? (Array.isArray(scopeResolution.queryScope)
            ? scopeResolution.queryScope.join(",")
            : "agg")
        : "invalid";

  const load = useCallback(async () => {
    if (!hasSupabaseEnv || scopeResolution.mode === "invalid") {
      setRows([]);
      setQueryError(scopeResolution.invalidReason);
      return;
    }
    setLoading(true);
    try {
      const result = await getBudgetDataByScopeAndPeriod(
        scopeResolution.queryScope,
        reportPeriod,
        budgetVersion
      );
      setRows(result.rows);
      setQueryError(result.error);
    } finally {
      setLoading(false);
    }
  }, [hasSupabaseEnv, scopeResolution, reportPeriod, budgetVersion, scopeKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const dbLine = useMemo(() => {
    if (!rows.length) return null;
    const line = aggregateBudgetDataRows(rows);
    if (line.营业收入 <= 0 && line.营业利润 <= 0 && line.人力成本 <= 0) return null;
    return line;
  }, [rows]);

  const budgetSubjects = useMemo(() => budgetDataRowsToCanonicalSubjectMap(rows), [rows]);

  const hasDbRows = rows.length > 0 && dbLine != null;
  const useDbBudget = hasSupabaseEnv && hasDbRows && scopeResolution.mode !== "invalid";

  const resolved = useMemo(() => {
    if (scopeResolution.mode === "invalid") {
      const line = resolveBudgetFinancialLine({
        dbLine: null,
        useDbBudget: false,
        mockScope: mockFallbackScope,
        period: reportPeriod,
        overrides,
        budgetVersion
      });
      return { ...line, source: "mock_derived" as BudgetSourceMode };
    }
    return resolveBudgetFinancialLine({
      dbLine,
      useDbBudget,
      mockScope: mockFallbackScope,
      period: reportPeriod,
      overrides,
      budgetVersion
    });
  }, [
    dbLine,
    useDbBudget,
    mockFallbackScope,
    reportPeriod,
    overrides,
    budgetVersion,
    scopeResolution.mode
  ]);

  return useMemo(
    () => ({
      budgetLine: resolved.line,
      budgetSubjects,
      loading,
      hasSupabaseEnv,
      hasDbRows,
      useDbBudget,
      budgetSource: resolved.source,
      scopeResolution,
      queryError,
      rowCount: rows.length,
      refresh: () => {
        void load();
      }
    }),
    [
      resolved,
      budgetSubjects,
      loading,
      hasSupabaseEnv,
      hasDbRows,
      useDbBudget,
      scopeResolution,
      queryError,
      rows.length,
      load
    ]
  );
}
