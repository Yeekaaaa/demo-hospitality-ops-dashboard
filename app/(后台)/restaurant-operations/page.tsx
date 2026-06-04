"use client";

import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/common/metric-card";
import { TrendChart } from "@/components/common/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSourceBanner } from "@/components/common/data-source-banner";
import { useActualDataSupabaseForScope } from "@/contexts/actual-data-supabase-context";
import { useActiveStores } from "@/contexts/active-stores-context";
import { useStorePeriod } from "@/contexts/store-period-context";
import { restaurantKpisFromOperatingSubjects } from "@/lib/actual-data-restaurant-kpis";
import { getActiveRestaurantStoreIds, getStoreDisplayName } from "@/lib/active-store-scope";
import { restaurantOperationsActualDataScope } from "@/lib/dashboard-actual-scope";
import { formatWan, getRestaurantOperationsKpis, getTrendSeries } from "@/lib/mock-analytics";
import {
  getTrendSeriesFromSupabase,
  type DashboardTrendPoint
} from "@/src/lib/dashboard-data-service";
import { formatMetricSourceLabel, METRIC_SOURCE_TAG } from "@/lib/metric-source-labels";

const MOCK_RESTAURANT_ID = "rest-xibeifu-sjz";
const RESTAURANT_KPI_FIELD_HINT = "该指标需补充对应经营字段后展示。";

export default function RestaurantOperationsPage() {
  const { reportPeriod, periodLabel } = useStorePeriod();
  const { stores: supabaseStores } = useActiveStores();

  const restaurantStoreIds = useMemo(
    () => getActiveRestaurantStoreIds(supabaseStores),
    [supabaseStores]
  );

  const restaurantStoreId = restaurantStoreIds[0] ?? null;

  const restaurantStoreLabel = useMemo(() => {
    if (!restaurantStoreId) return "西北赋（未在经营门店列表中）";
    const s = supabaseStores.find((x) => x.id === restaurantStoreId);
    return s ? getStoreDisplayName(s) : "西北赋";
  }, [restaurantStoreId, supabaseStores]);

  const actualDataScope = useMemo(
    () => restaurantOperationsActualDataScope(supabaseStores),
    [supabaseStores]
  );

  const {
    operatingSubjects,
    hasSupabaseEnv: hasActualDataEnv,
    hasDbRows,
    loading: actualDataLoading
  } = useActualDataSupabaseForScope(actualDataScope, reportPeriod);

  const useDbActual = hasActualDataEnv && hasDbRows && restaurantStoreId != null;

  const mockKpis = useMemo(
    () => getRestaurantOperationsKpis(MOCK_RESTAURANT_ID, reportPeriod),
    [reportPeriod]
  );

  const dbKpis = useMemo(
    () => restaurantKpisFromOperatingSubjects(operatingSubjects),
    [operatingSubjects]
  );

  const dataTag = useDbActual ? METRIC_SOURCE_TAG.operatingActual : METRIC_SOURCE_TAG.demo;
  const dataTagLabel = formatMetricSourceLabel(dataTag);

  const [trendFromDb, setTrendFromDb] = useState<DashboardTrendPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTrendFromDb(null);
    if (!hasActualDataEnv || !restaurantStoreId) return;

    getTrendSeriesFromSupabase(restaurantStoreId, "restaurantBoard", reportPeriod)
      .then((list) => {
        if (!cancelled) setTrendFromDb(list && list.length > 0 ? list : null);
      })
      .catch(() => {
        if (!cancelled) setTrendFromDb(null);
      });

    return () => {
      cancelled = true;
    };
  }, [hasActualDataEnv, reportPeriod, restaurantStoreId]);

  const mockTrend = useMemo(
    () =>
      getTrendSeries(MOCK_RESTAURANT_ID).map((r) => ({
        周期: r.周期,
        收入: r.实际收入,
        成本: r.实际成本,
        利润: r.实际利润
      })),
    []
  );

  const trend =
    trendFromDb && trendFromDb.length > 0 ? trendFromDb : mockTrend.length > 0 ? mockTrend : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">餐饮运营</h1>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-950">
              餐饮经营
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="text-muted-foreground">当前门店：</span>
            <span className="font-medium text-slate-800">{restaurantStoreLabel}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="text-muted-foreground">当前账期：</span>
            <span className="font-medium text-slate-800">{periodLabel}</span>
          </p>
        </div>
        <div className="flex h-10 min-w-[200px] items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800">
          {restaurantStoreLabel}
        </div>
      </div>

      <DataSourceBanner
        actual={{
          hasSupabaseEnv: hasActualDataEnv,
          loading: actualDataLoading,
          useDbActual,
          reportPeriod,
          scopeDescription: restaurantStoreLabel
        }}
      />

      <section aria-labelledby="restaurant-kpi">
        <h2
          id="restaurant-kpi"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          本期经营指标
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          标题="营业收入"
          数值={formatWan(useDbActual ? dbKpis.营业收入 : mockKpis.营业收入)}
          变化=""
          趋势="neutral"
          数据来源={dataTagLabel}
        />
        <MetricCard
          标题="客单价（估）"
          数值={useDbActual ? "—" : `¥ ${mockKpis.客单价}`}
          变化=""
          趋势="neutral"
          数据来源={dataTagLabel}
          说明={useDbActual ? RESTAURANT_KPI_FIELD_HINT : undefined}
        />
        <MetricCard
          标题="毛利率"
          数值={
            useDbActual
              ? "—"
              : `${(mockKpis.毛利率 * 100).toFixed(1)}%`
          }
          变化=""
          趋势="neutral"
          数据来源={dataTagLabel}
          说明={useDbActual ? RESTAURANT_KPI_FIELD_HINT : undefined}
        />
        <MetricCard
          标题="原材料成本"
          数值={formatWan(
            useDbActual
              ? dbKpis.原材料成本 > 0
                ? dbKpis.原材料成本
                : dbKpis.总成本
              : mockKpis.原材料成本
          )}
          变化=""
          趋势="neutral"
          数据来源={dataTagLabel}
        />
        <MetricCard
          标题="损耗率"
          数值={useDbActual ? "—" : `${(mockKpis.损耗率 * 100).toFixed(2)}%`}
          变化=""
          趋势="neutral"
          数据来源={dataTagLabel}
          说明={useDbActual ? RESTAURANT_KPI_FIELD_HINT : undefined}
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
        {!useDbActual ? (
          <Card className="border border-dashed border-slate-200 bg-muted/30 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                演示摘要（界面示例）
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-800">
              <p className="rounded-md border border-slate-200/80 bg-background/80 p-2.5">
                关注原材料成本与损耗管控，旺季可适当提高备货周转。
              </p>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
