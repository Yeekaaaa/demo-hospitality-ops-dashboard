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
import {
  ACTIVE_STORE_SCOPE_DETAIL_LABEL,
  ACTIVE_STORE_SCOPE_SHORT_LABEL,
  findDefaultActiveSupabaseStoreId,
  filterActiveStores,
  sanitizeCachedStoreSelection
} from "@/lib/active-store-scope";
import { getActiveStoresIncludeAll, type StoreListItem } from "@/src/lib/supabase";
import { primeActiveStoreIds } from "@/src/lib/active-store-ids";

type ActiveStoresContextValue = {
  stores: StoreListItem[];
  activeStoreIds: string[];
  loading: boolean;
  scopeShortLabel: string;
  scopeDetailLabel: string;
  defaultStoreId: string | null;
  sanitizeStoreId: (storeId: string | null | undefined) => {
    storeScope: "all" | "single";
    storeId: string | null;
  };
};

const ActiveStoresContext = createContext<ActiveStoresContextValue | null>(null);

export function ActiveStoresProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getActiveStoresIncludeAll();
        if (!cancelled) {
          setStores(list);
          primeActiveStoreIds(list.map((s) => s.id));
        }
      } catch {
        if (!cancelled) setStores([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeStoreIds = useMemo(() => stores.map((s) => s.id), [stores]);

  const defaultStoreId = useMemo(() => findDefaultActiveSupabaseStoreId(stores), [stores]);

  const sanitizeStoreId = useCallback(
    (storeId: string | null | undefined) => sanitizeCachedStoreSelection(storeId, stores),
    [stores]
  );

  const value = useMemo(
    () => ({
      stores: filterActiveStores(stores),
      activeStoreIds,
      loading,
      scopeShortLabel: ACTIVE_STORE_SCOPE_SHORT_LABEL,
      scopeDetailLabel: ACTIVE_STORE_SCOPE_DETAIL_LABEL,
      defaultStoreId,
      sanitizeStoreId
    }),
    [stores, activeStoreIds, loading, defaultStoreId, sanitizeStoreId]
  );

  return <ActiveStoresContext.Provider value={value}>{children}</ActiveStoresContext.Provider>;
}

export function useActiveStores(): ActiveStoresContextValue {
  const ctx = useContext(ActiveStoresContext);
  if (!ctx) {
    return {
      stores: [],
      activeStoreIds: [],
      loading: true,
      scopeShortLabel: ACTIVE_STORE_SCOPE_SHORT_LABEL,
      scopeDetailLabel: ACTIVE_STORE_SCOPE_DETAIL_LABEL,
      defaultStoreId: null,
      sanitizeStoreId: (id) =>
        id ? { storeScope: "single" as const, storeId: id } : { storeScope: "all" as const, storeId: null }
    };
  }
  return ctx;
}
