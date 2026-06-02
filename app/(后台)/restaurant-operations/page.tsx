"use client";

import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/common/metric-card";
import { TrendChart } from "@/components/common/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStorePeriod } from "@/contexts/store-period-context";
import { formatWan, getRestaurantOperationsKpis, getTrendSeries } from "@/lib/mock-analytics";
import { getRestaurantStores, 全部门店值 } from "@/lib/store-master";

export default function RestaurantOperationsPage() {
  const { storeId, reportPeriod } = useStorePeriod();
  const rests = getRestaurantStores();

  const effectiveScope = useMemo<"all" | string>(() => {
    if (storeId === 全部门店值) return "all";
    if (rests.some((r) => r.id === storeId)) return storeId;
    return "all";
  }, [storeId, rests]);

  const [localRest, setLocalRest] = useState<"all" | string>(effectiveScope);
  useEffect(() => {
    setLocalRest(effectiveScope);
  }, [effectiveScope]);

  const kpis = useMemo(
    () => getRestaurantOperationsKpis(localRest === "all" ? "all" : localRest, reportPeriod),
    [localRest, reportPeriod]
  );

  const trend = useMemo(() => {
    const scope = localRest === "all" ? 全部门店值 : localRest;
    return getTrendSeries(scope).map((r) => ({
      周期: r.周期,
      收入: r.实际收入,
      成本: r.实际成本,
      利润: r.实际利润
    }));
  }, [localRest]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">餐饮运营</h1>
          <p className="text-sm text-muted-foreground">当前在营餐饮门店：西北赋｜石家庄（演示逻辑）</p>
        </div>
        <div className="w-72">
          <Select
            value={localRest}
            onValueChange={(v) => setLocalRest(v as "all" | string)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部餐饮</SelectItem>
              {rests.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.显示名称}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {storeId !== 全部门店值 && !rests.some((r) => r.id === storeId) && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          当前顶部筛选为酒店门店，本页已按「全部餐饮」汇总展示。
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          标题="营业收入"
          数值={formatWan(kpis.营业收入)}
          变化="+4.2%"
          趋势="up"
        />
        <MetricCard
          标题="客单价（估）"
          数值={`¥ ${kpis.客单价}`}
          变化="西北赋更高"
          趋势="neutral"
        />
        <MetricCard
          标题="毛利率"
          数值={`${(kpis.毛利率 * 100).toFixed(1)}%`}
          变化="+0.6%"
          趋势="up"
        />
        <MetricCard
          标题="原材料成本"
          数值={formatWan(kpis.原材料成本)}
          变化="+1.1%"
          趋势="up"
        />
        <MetricCard
          标题="损耗率"
          数值={`${(kpis.损耗率 * 100).toFixed(2)}%`}
          变化="-0.1%"
          趋势="down"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>餐饮经营趋势（近 6 月 · 实际）</CardTitle>
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
              西北赋｜石家庄：收入与客单较高，人工与原材料占比需持续对标管控。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
