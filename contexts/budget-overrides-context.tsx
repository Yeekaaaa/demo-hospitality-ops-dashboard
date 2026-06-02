"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  buildBudgetStorageKey,
  LOCAL_STORAGE_BUDGET_KEY,
  type BudgetEditableValues,
  type BudgetOverrideMap
} from "@/lib/budget-overrides";
import { DEFAULT_BUDGET_VERSION, type BudgetVersionValue } from "@/lib/budget-versions";
import type { ReportPeriod } from "@/lib/mock-analytics";

type BudgetOverridesContextValue = {
  overrides: BudgetOverrideMap;
  setBudgetOverride: (
    scope: string,
    period: ReportPeriod,
    values: BudgetEditableValues,
    budgetVersion?: BudgetVersionValue
  ) => void;
  mergeBudgetOverrides: (nextEntries: BudgetOverrideMap) => void;
  getBudgetOverride: (
    scope: string,
    period: ReportPeriod,
    budgetVersion?: BudgetVersionValue
  ) => BudgetEditableValues | undefined;
  clearBudgetOverride: (
    scope: string,
    period: ReportPeriod,
    budgetVersion?: BudgetVersionValue
  ) => void;
  clearAllBudgetOverrides: () => void;
};

const BudgetOverridesContext = createContext<BudgetOverridesContextValue | null>(null);

export function BudgetOverridesProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<BudgetOverrideMap>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_BUDGET_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as BudgetOverrideMap;
      if (parsed && typeof parsed === "object") setOverrides(parsed);
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_BUDGET_KEY, JSON.stringify(overrides));
  }, [overrides]);

  const value = useMemo<BudgetOverridesContextValue>(
    () => ({
      overrides,
      setBudgetOverride: (scope, period, values, budgetVersion = DEFAULT_BUDGET_VERSION) => {
        const key = buildBudgetStorageKey(scope, period, budgetVersion);
        setOverrides((prev) => ({ ...prev, [key]: values }));
      },
      mergeBudgetOverrides: (nextEntries) => {
        setOverrides((prev) => ({ ...prev, ...nextEntries }));
      },
      getBudgetOverride: (scope, period, budgetVersion = DEFAULT_BUDGET_VERSION) =>
        overrides[buildBudgetStorageKey(scope, period, budgetVersion)],
      clearBudgetOverride: (scope, period, budgetVersion = DEFAULT_BUDGET_VERSION) => {
        const key = buildBudgetStorageKey(scope, period, budgetVersion);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      },
      clearAllBudgetOverrides: () => setOverrides({})
    }),
    [overrides]
  );

  return <BudgetOverridesContext.Provider value={value}>{children}</BudgetOverridesContext.Provider>;
}

export function useBudgetOverrides() {
  const ctx = useContext(BudgetOverridesContext);
  if (!ctx) throw new Error("useBudgetOverrides 必须在 BudgetOverridesProvider 内使用");
  return ctx;
}
