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
import { 全部门店值 } from "@/lib/store-master";
import {
  getTrendSeriesFromSupabase,
  type DashboardTrendPoint
} from "@/src/lib/dashboard-data-service";

function displayMetricSourceLabel(change: string): string {
  if (change === "actual_data") return "经营实际";
  if (change === "budget_data") return "预算目标";
  if (change === "mock demo") return "演示数据";
  if (change === "budget_overrides") return "预算调整";
  return change;
}

export default function HotelOperationsPage() {
  const { storeId, reportPeriod, periodLabel } = useStorePeriod();
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
  const dataTagLabel = displayMetricSourceLabel(dataTag);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">酒店运营</h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
              酒店经营
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="text-muted-foreground">当前范围：</span>
            <span className="font-medium text-slate-800">{actualDataScopeLabel}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="text-muted-foreground">当前账期：</span>
            <span className="font-medium text-slate-800">{periodLabel}</span>
          </p>
        </div>
        <div className="w-full min-w-[200px] max-w-xs space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">本页范围</span>
          <Select
            value={localHotel}
            onValueChange={(v) => setLocalHotel(v as "all" | string)}
          >
            <SelectTrigger className="h-10">
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

      <section aria-labelledby="hotel-room-kpi">
        <h2
          id="hotel-room-kpi"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          客房与收益
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            标题="可售间夜数"
            数值={kpis.可售间夜.toLocaleString("zh-CN")}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
          <MetricCard
            标题="已售间数"
            数值={kpis.已售间数.toLocaleString("zh-CN")}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
          <MetricCard
            标题="入住率"
            数值={`${(kpis.入住率 * 100).toFixed(1)}%`}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
          <MetricCard
            标题="平均房价"
            数值={`¥ ${kpis.平均房价}`}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
          <MetricCard
            标题="RevPAR"
            数值={`¥ ${kpis.revpar}`}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
          <MetricCard
            标题="客房收入"
            数值={formatWan(kpis.客房收入)}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
        </div>
      </section>

      <section aria-labelledby="hotel-budget-kpi">
        <h2
          id="hotel-budget-kpi"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          预算完成率（对比预算，非经营导入）
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            标题="本期实际收入（酒店）"
            数值={formatWan(hotelRevenueActual)}
            变化=""
            趋势="neutral"
            数据来源={displayMetricSourceLabel(useDbActual ? "actual_data" : "mock demo")}
          />
          <MetricCard
            标题="本期预算收入（酒店）"
            数值={formatWan(budgetFin.营业收入)}
            变化=""
            趋势="neutral"
            数据来源={displayMetricSourceLabel(useDbBudget ? "budget_data" : "budget_overrides")}
          />
          <MetricCard
            标题="收入预算完成率"
            数值={revenueCompletion != null ? formatPct(revenueCompletion) : "—"}
            变化={revenueCompletion != null && revenueCompletion >= 1 ? "达标" : "对比预算"}
            趋势={revenueCompletion != null && revenueCompletion >= 1 ? "up" : "neutral"}
          />
        </div>
      </section>

      <section aria-labelledby="hotel-cost-kpi">
        <h2
          id="hotel-cost-kpi"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          费用
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            标题="华住管理费"
            数值={formatWan(kpis.华住管理费)}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
          <MetricCard
            标题="人力成本"
            数值={formatWan(kpis.人力成本)}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
          <MetricCard
            标题="能源费用"
            数值={formatWan(kpis.能源费用)}
            变化=""
            趋势="neutral"
            数据来源={dataTagLabel}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-slate-200 shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">经营趋势</CardTitle>
            <p className="text-sm text-muted-foreground">
              收入、成本、利润随账期变化（近 6 个账期）
            </p>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
          </CardContent>
        </Card>
        <Card className="border border-dashed border-slate-200 bg-muted/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              演示摘要（界面示例，非经营导入）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm leading-relaxed">
            <p className="rounded-md border border-slate-200/80 bg-background/80 p-2.5 text-slate-800">
              沐家·全季槐安西、雨航·全季中山西：ADR 与利润表现优于均值。
            </p>
            <p className="rounded-md border border-slate-200/80 bg-background/80 p-2.5 text-slate-800">
              泽桐·星程中山西：入住率领先，房价带略低，适合加强协议价管理。
            </p>
          </CardContent>
        </Card>
      </section>

      <details className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          旧版本地导入（临时查看）
        </summary>
        <div className="space-y-2 border-t border-slate-100 px-4 pb-4 pt-2">
          <p className="text-xs leading-relaxed text-muted-foreground">
            旧版本地导入，仅用于临时查看；正式经营数据请使用
            <a href="/operating-data-template" className="mx-1 text-primary underline">
              经营数据导入
            </a>
            模板（42 列标准格式）。
          </p>
          <ActualExcelImportPanel
            mode="hotel"
            existingOverrides={actualOverrides}
            onImport={(entries) => mergeActualOverrides(entries)}
          />
        </div>
      </details>
    </div>
  );
}
