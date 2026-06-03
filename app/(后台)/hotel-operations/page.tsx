"use client";

import { useEffect, useMemo, useState } from "react";
import { ActualExcelImportPanel } from "@/components/actual/actual-excel-import-panel";
import { DataSourceBanner } from "@/components/common/data-source-banner";
import { MetricCard } from "@/components/common/metric-card";
import { TrendChart } from "@/components/common/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActualOverrides } from "@/contexts/actual-overrides-context";
import { useActualDataSupabaseForScope } from "@/contexts/actual-data-supabase-context";
import { useActiveStores } from "@/contexts/active-stores-context";
import { useBudgetOverrides } from "@/contexts/budget-overrides-context";
import { useStorePeriod } from "@/contexts/store-period-context";
import { hotelKpisFromOperatingSubjects } from "@/lib/actual-data-hotel-kpis";
import { hotelOperationsToActualDataScope } from "@/lib/dashboard-actual-scope";
import {
  getActiveHotelStoreIds,
  getStoreDisplayName,
  isSupabaseStoreUuid
} from "@/lib/active-store-scope";
import {
  formatPct,
  formatWan,
  getActualAggregated,
  getHotelOperationsKpis,
  getTrendSeries
} from "@/lib/mock-analytics";
import { useBudgetDataForScope } from "@/contexts/budget-data-supabase-context";
import { resolveBudgetScopeFromQueryScope } from "@/lib/budget-scope";
import { DEFAULT_BUDGET_VERSION } from "@/lib/budget-versions";
import { DATA_CALIBER_RULES } from "@/lib/data-caliber";
import { 全部门店值 } from "@/lib/store-master";
import {
  getTrendSeriesFromSupabase,
  type DashboardTrendPoint
} from "@/src/lib/dashboard-data-service";

export default function HotelOperationsPage() {
  const { storeId, reportPeriod } = useStorePeriod();
  const { overrides: actualOverrides, mergeActualOverrides } = useActualOverrides();
  const { overrides: budgetOverrides } = useBudgetOverrides();
  const { stores: supabaseStores } = useActiveStores();

  const hotelStoreOptions = useMemo(
    () =>
      getActiveHotelStoreIds(supabaseStores).map((id) => {
        const s = supabaseStores.find((x) => x.id === id);
        return { id, label: s ? getStoreDisplayName(s) : id };
      }),
    [supabaseStores]
  );

  const effectiveScope = useMemo<"all" | string>(() => {
    if (storeId === 全部门店值) return "all";
    const hotelIds = getActiveHotelStoreIds(supabaseStores);
    if (isSupabaseStoreUuid(storeId) && hotelIds.includes(storeId)) return storeId;
    return "all";
  }, [storeId, supabaseStores]);

  const [localHotel, setLocalHotel] = useState<"all" | string>(effectiveScope);
  useEffect(() => {
    setLocalHotel(effectiveScope);
  }, [effectiveScope]);

  const actualDataScope = useMemo(
    () => hotelOperationsToActualDataScope(localHotel, supabaseStores),
    [localHotel, supabaseStores]
  );

  const actualDataScopeLabel = useMemo(() => {
    if (typeof actualDataScope === "string") {
      const s = supabaseStores.find((x) => x.id === actualDataScope);
      return s ? getStoreDisplayName(s) : actualDataScope;
    }
    if (Array.isArray(actualDataScope)) {
      return `全部酒店（${actualDataScope.length} 店）`;
    }
    return "—";
  }, [actualDataScope, supabaseStores]);

  const {
    operatingSubjects,
    hasSupabaseEnv: hasActualDataEnv,
    hasDbRows,
    loading: actualDataLoading
  } = useActualDataSupabaseForScope(actualDataScope, reportPeriod);

  const useDbActual = hasActualDataEnv && hasDbRows;

  const budgetMockScope = localHotel === "all" ? 全部门店值 : localHotel;

  const budgetScopeResolution = useMemo(
    () => resolveBudgetScopeFromQueryScope(actualDataScope, supabaseStores),
    [actualDataScope, supabaseStores]
  );

  const {
    budgetLine: budgetFin,
    useDbBudget,
    hasSupabaseEnv: hasBudgetEnv,
    loading: budgetLoading,
    budgetSource,
    queryError: budgetQueryError,
    rowCount: budgetRowCount
  } = useBudgetDataForScope(reportPeriod, {
    scopeResolution: budgetScopeResolution,
    mockFallbackScope: budgetMockScope,
    overrides: budgetOverrides,
    budgetVersion: DEFAULT_BUDGET_VERSION
  });

  const mockKpis = useMemo(
    () =>
      getHotelOperationsKpis(
        localHotel === "all" ? "all" : localHotel,
        reportPeriod,
        actualOverrides
      ),
    [localHotel, reportPeriod, actualOverrides]
  );

  const kpis = useMemo(() => {
    if (useDbActual) return hotelKpisFromOperatingSubjects(operatingSubjects);
    return mockKpis;
  }, [useDbActual, operatingSubjects, mockKpis]);

  const hotelRevenueActual = useMemo(() => {
    if (useDbActual) {
      const rev = operatingSubjects["营业收入"] ?? operatingSubjects["客房收入"];
      return rev != null && Number.isFinite(rev) ? rev : 0;
    }
    const scope = localHotel === "all" ? 全部门店值 : localHotel;
    const line = getActualAggregated(scope, reportPeriod, actualOverrides);
    return line.营业收入;
  }, [useDbActual, operatingSubjects, localHotel, reportPeriod, actualOverrides]);

  const revenueCompletion = useMemo(() => {
    const b = budgetFin.营业收入;
    if (b <= 0) return null;
    return hotelRevenueActual / b;
  }, [hotelRevenueActual, budgetFin.营业收入]);

  const [trendFromDb, setTrendFromDb] = useState<DashboardTrendPoint[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setTrendFromDb(null);
    if (!hasActualDataEnv) return;
    const trendStoreId = localHotel === "all" ? 全部门店值 : localHotel;
    getTrendSeriesFromSupabase(trendStoreId, "hotelBoard", reportPeriod)
      .then((list) => {
        if (!cancelled) setTrendFromDb(list && list.length > 0 ? list : null);
      })
      .catch(() => {
        if (!cancelled) setTrendFromDb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hasActualDataEnv, reportPeriod, localHotel]);

  const mockTrend = useMemo(() => {
    const scope = localHotel === "all" ? 全部门店值 : localHotel;
    return getTrendSeries(scope, undefined, actualOverrides).map((r) => ({
      周期: r.周期,
      收入: r.实际收入,
      成本: r.实际成本,
      利润: r.实际利润
    }));
  }, [localHotel, actualOverrides]);

  const trend =
    trendFromDb && trendFromDb.length > 0 ? trendFromDb : mockTrend.length > 0 ? mockTrend : [];

  const dataTag = useDbActual ? "actual_data" : "mock demo";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">酒店运营</h1>
          <p className="text-sm text-muted-foreground">
            仅含酒店门店；经营指标优先来自 actual_data。{DATA_CALIBER_RULES.hotelOpsRead}
          </p>
        </div>
        <div className="w-72">
          <Select
            value={localHotel}
            onValueChange={(v) => setLocalHotel(v as "all" | string)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部酒店</SelectItem>
              {hotelStoreOptions.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {storeId !== 全部门店值 &&
        !getActiveHotelStoreIds(supabaseStores).includes(storeId) && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            当前顶部筛选为餐饮门店，本页已按「全部酒店」汇总展示。
          </p>
        )}

      <DataSourceBanner
        actual={{
          hasSupabaseEnv: hasActualDataEnv,
          loading: actualDataLoading,
          useDbActual,
          reportPeriod,
          scopeDescription: actualDataScopeLabel
        }}
        budget={{
          hasSupabaseEnv: hasBudgetEnv,
          loading: budgetLoading,
          scopeMode: budgetScopeResolution.mode,
          useDbBudget,
          budgetSource,
          singleStoreId: budgetScopeResolution.singleStoreId,
          queryError: budgetQueryError,
          rowCount: budgetRowCount,
          invalidReason: budgetScopeResolution.invalidReason,
          reportPeriod,
          scopeDescription: budgetScopeResolution.scopeLabel
        }}
      />

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">客房与收益</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            标题="可售间夜数"
            数值={kpis.可售间夜.toLocaleString("zh-CN")}
            变化={dataTag}
            趋势="neutral"
          />
          <MetricCard
            标题="已售间数"
            数值={kpis.已售间数.toLocaleString("zh-CN")}
            变化={dataTag}
            趋势="neutral"
          />
          <MetricCard
            标题="入住率"
            数值={`${(kpis.入住率 * 100).toFixed(1)}%`}
            变化={dataTag}
            趋势="neutral"
          />
          <MetricCard
            标题="平均房价"
            数值={`¥ ${kpis.平均房价}`}
            变化={dataTag}
            趋势="neutral"
          />
          <MetricCard 标题="RevPAR" 数值={`¥ ${kpis.revpar}`} 变化={dataTag} 趋势="neutral" />
          <MetricCard
            标题="客房收入"
            数值={formatWan(kpis.客房收入)}
            变化={dataTag}
            趋势="neutral"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">预算完成率（仅对比，非经营来源）</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            标题="本期实际收入（酒店）"
            数值={formatWan(hotelRevenueActual)}
            变化={useDbActual ? "actual_data" : "mock demo"}
            趋势="neutral"
          />
          <MetricCard
            标题="本期预算收入（酒店）"
            数值={formatWan(budgetFin.营业收入)}
            变化={useDbBudget ? "budget_data" : "budget_overrides"}
            趋势="neutral"
          />
          <MetricCard
            标题="收入预算完成率"
            数值={revenueCompletion != null ? formatPct(revenueCompletion) : "—"}
            变化={revenueCompletion != null && revenueCompletion >= 1 ? "达标" : "对比预算"}
            趋势={revenueCompletion != null && revenueCompletion >= 1 ? "up" : "neutral"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">费用</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            标题="华住管理费"
            数值={formatWan(kpis.华住管理费)}
            变化={dataTag}
            趋势="neutral"
          />
          <MetricCard
            标题="人力成本"
            数值={formatWan(kpis.人力成本)}
            变化={dataTag}
            趋势="neutral"
          />
          <MetricCard
            标题="能源费用"
            数值={formatWan(kpis.能源费用)}
            变化={dataTag}
            趋势="neutral"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>酒店经营趋势（近 6 期 · 实际）</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>单店摘要（演示）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="rounded-md bg-secondary p-3">
              沐家·全季槐安西、雨航·全季中山西：ADR 与利润表现优于均值。
            </p>
            <p className="rounded-md bg-secondary p-3">
              泽桐·星程中山西：入住率领先，房价带略低，适合加强协议价管理。
            </p>
          </CardContent>
        </Card>
      </section>

      <ActualExcelImportPanel
        mode="hotel"
        existingOverrides={actualOverrides}
        onImport={(entries) => mergeActualOverrides(entries)}
      />
    </div>
  );
}
