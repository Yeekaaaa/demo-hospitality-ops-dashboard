"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  buildActualStorageKey,
  LOCAL_STORAGE_ACTUAL_KEY,
  type ActualOverrideMap,
  type ActualOverrideValues
} from "@/lib/actual-overrides";
import type { ReportPeriod } from "@/lib/mock-analytics";

type ActualOverridesContextValue = {
  overrides: ActualOverrideMap;
  setActualOverride: (scope: string, period: ReportPeriod, values: ActualOverrideValues) => void;
  mergeActualOverrides: (entries: ActualOverrideMap) => void;
  getActualOverride: (scope: string, period: ReportPeriod) => ActualOverrideValues | undefined;
  clearActualOverride: (scope: string, period: ReportPeriod) => void;
};

const ActualOverridesContext = createContext<ActualOverridesContextValue | null>(null);

export function ActualOverridesProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<ActualOverrideMap>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_ACTUAL_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ActualOverrideMap;
      if (parsed && typeof parsed === "object") setOverrides(parsed);
    } catch {
      // ignore malformed data
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_ACTUAL_KEY, JSON.stringify(overrides));
  }, [overrides]);

  const value = useMemo<ActualOverridesContextValue>(
    () => ({
      overrides,
      setActualOverride: (scope, period, values) => {
        const key = buildActualStorageKey(scope, period);
        setOverrides((prev) => ({ ...prev, [key]: values }));
      },
      mergeActualOverrides: (entries) => setOverrides((prev) => ({ ...prev, ...entries })),
      getActualOverride: (scope, period) => overrides[buildActualStorageKey(scope, period)],
      clearActualOverride: (scope, period) => {
        const key = buildActualStorageKey(scope, period);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    }),
    [overrides]
  );

  return <ActualOverridesContext.Provider value={value}>{children}</ActualOverridesContext.Provider>;
}

export function useActualOverrides() {
  const ctx = useContext(ActualOverridesContext);
  if (!ctx) throw new Error("useActualOverrides 必须在 ActualOverridesProvider 内使用");
  return ctx;
}
