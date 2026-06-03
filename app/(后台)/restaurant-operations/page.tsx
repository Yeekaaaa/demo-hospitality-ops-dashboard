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

const MOCK_RESTAURANT_ID = "rest-xibeifu-sjz";

export default function RestaurantOperationsPage() {
  const { reportPeriod } = useStorePeriod();
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

  const dataTag = useDbActual ? "actual_data" : "mock demo";

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

  const hasActiveRestaurantInSupabase = restaurantStoreId != null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">餐饮运营</h1>
        <p className="text-sm text-muted-foreground">
          当前餐饮门店：{restaurantStoreLabel}
          {!hasActiveRestaurantInSupabase ? "（演示数据，未匹配 Supabase 在营餐饮门店）" : null}
        </p>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          标题="营业收入"
          数值={formatWan(useDbActual ? dbKpis.营业收入 : mockKpis.营业收入)}
          变化={dataTag}
          趋势="neutral"
        />
        <MetricCard
          标题="客单价（估）"
          数值={useDbActual ? "—" : `¥ ${mockKpis.客单价}`}
          变化={dataTag}
          趋势="neutral"
        />
        <MetricCard
          标题="毛利率"
          数值={
            useDbActual
              ? "—"
              : `${(mockKpis.毛利率 * 100).toFixed(1)}%`
          }
          变化={dataTag}
          趋势="neutral"
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
          变化={dataTag}
          趋势="neutral"
        />
        <MetricCard
          标题="损耗率"
          数值={useDbActual ? "—" : `${(mockKpis.损耗率 * 100).toFixed(2)}%`}
          变化={dataTag}
          趋势="neutral"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>
              餐饮经营趋势（近 6 期 · {useDbActual && trendFromDb?.length ? "实际" : "演示"}）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>经营摘要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="rounded-md bg-secondary p-3 text-foreground">
              {hasActiveRestaurantInSupabase
                ? `${restaurantStoreLabel}：${useDbActual ? "已加载本账期经营实际。" : "本账期暂无经营实际，展示演示数据。"}`
                : "未匹配 Supabase 餐饮门店，展示演示数据。"}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
