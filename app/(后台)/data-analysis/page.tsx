"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildMockCockpitSnapshot,
  getMockCockpitStoreRanking,
  type BoardType
} from "@/lib/dashboard-cockpit-mock";
import {
  alertPriorityLabel,
  alertToInvestorGap,
  buildAssetQualityOwnerNarrative,
  buildBusinessPerformanceIntro,
  buildGrowthOpportunityBullets,
  buildInvestmentHighlights,
  buildInvestorDriverNarrative,
  buildInvestorProfitabilityConclusion,
  buildInvestorRevenueConclusion,
  buildOperatingLeverageNarrative,
  buildStrategicRoadmap,
  hasAggregateSignal,
  type CockpitAlertItem
} from "@/lib/data-analysis-narratives";
import {
  calcChange,
  calcOccupancyRate,
  calcProfitMargin,
  calcRevPAR,
  formatPctOneDecimal,
  getPreviousReportPeriod
} from "@/lib/dashboard-metrics";
import { summarizeActualDataAssetRows } from "@/lib/actual-data-asset-aggregate";
import { formatWan } from "@/lib/mock-analytics";
import { useActualOverrides } from "@/contexts/actual-overrides-context";
import { useStorePeriod } from "@/contexts/store-period-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getActualDataRowsForPeriodWithStores,
  getCockpitSnapshotFromSupabase,
  getStoreCockpitRankingFromSupabase,
  type CockpitSnapshot,
  type CockpitStoreRankingRow
} from "@/src/lib/dashboard-data-service";

const ANALYSIS_BOARD: BoardType = "all";

function emptySnapshot(): CockpitSnapshot {
  return {
    current: { revenue: 0, totalCost: 0, profit: 0, roomsSold: 0, roomsAvailable: 0, roomRevenueWan: 0 },
    previous: { revenue: 0, totalCost: 0, profit: 0, roomsSold: 0, roomsAvailable: 0, roomRevenueWan: 0 },
    yearAgo: { revenue: 0, totalCost: 0, profit: 0, roomsSold: 0, roomsAvailable: 0, roomRevenueWan: 0 },
    structure: {
      hotelRevenue: 0,
      restaurantRevenue: 0,
      otherRevenue: 0,
      hotelCost: 0,
      restaurantCost: 0,
      otherCost: 0
    }
  };
}

export default function DataAnalysisPage() {
  const { storeId, reportPeriod, periodLabel } = useStorePeriod();
  const { overrides: actualOverrides } = useActualOverrides();
  const prevReportPeriod = useMemo(() => getPreviousReportPeriod(reportPeriod), [reportPeriod]);

  const [cockpitFromDb, setCockpitFromDb] = useState<CockpitSnapshot | null>(null);
  useEffect(() => {
    let cancelled = false;
    setCockpitFromDb(null);
    getCockpitSnapshotFromSupabase(storeId, ANALYSIS_BOARD, reportPeriod)
      .then((row) => {
        if (!cancelled) setCockpitFromDb(row);
      })
      .catch(() => {
        if (!cancelled) setCockpitFromDb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, reportPeriod]);

  const mockSnapshot = useMemo(
    () => buildMockCockpitSnapshot(storeId, ANALYSIS_BOARD, reportPeriod, actualOverrides),
    [storeId, reportPeriod, actualOverrides]
  );

  const snapshot = cockpitFromDb ?? mockSnapshot ?? emptySnapshot();

  const [cockpitRankingDb, setCockpitRankingDb] = useState<CockpitStoreRankingRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getStoreCockpitRankingFromSupabase(reportPeriod, "all")
      .then((rows) => {
        if (!cancelled) setCockpitRankingDb(rows && rows.length ? rows : null);
      })
      .catch(() => {
        if (!cancelled) setCockpitRankingDb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reportPeriod]);

  const cockpitRows = useMemo(() => {
    if (cockpitRankingDb && cockpitRankingDb.length > 0) return cockpitRankingDb;
    return getMockCockpitStoreRanking(
      storeId,
      ANALYSIS_BOARD,
      "all",
      reportPeriod,
      prevReportPeriod,
      actualOverrides
    );
  }, [cockpitRankingDb, storeId, reportPeriod, prevReportPeriod, actualOverrides]);

  const marginPct = calcProfitMargin(snapshot.current.revenue, snapshot.current.profit);
  const occCurrent = calcOccupancyRate(snapshot.current.roomsSold, snapshot.current.roomsAvailable);
  const revCurrent =
    snapshot.current.roomsAvailable > 0 ? calcRevPAR(snapshot.current.roomRevenueWan, snapshot.current.roomsAvailable) : 0;
  const hasHotelMetrics = snapshot.current.roomsAvailable > 0;

  const hotelRevparList = useMemo(
    () => cockpitRows.filter((r) => r.store_type_label === "酒店" && r.revpar != null && r.revpar > 0),
    [cockpitRows]
  );
  const avgHotelRevpar = useMemo(() => {
    if (!hotelRevparList.length) return 0;
    return hotelRevparList.reduce((s, r) => s + (r.revpar ?? 0), 0) / hotelRevparList.length;
  }, [hotelRevparList]);

  const alerts = useMemo((): CockpitAlertItem[] => {
    const items: CockpitAlertItem[] = [];
    for (const r of cockpitRows) {
      if (r.profit < 0) {
        items.push({
          level: "严重",
          store: r.store_name,
          desc: "本期利润为负",
          action: "建议复盘成本结构和入住率"
        });
      } else if (r.profit_margin * 100 < 5) {
        items.push({
          level: "注意",
          store: r.store_name,
          desc: "利润率低于 5%",
          action: "建议优化人力与原材料成本结构"
        });
      }
      if (r.mom_profit_change_pct < -10) {
        items.push({
          level: "注意",
          store: r.store_name,
          desc: `利润环比下降 ${formatPctOneDecimal(Math.abs(r.mom_profit_change_pct))}`,
          action: "建议对比收入渠道与固定费用变化"
        });
      }
      if (
        r.store_type_label === "酒店" &&
        r.revpar != null &&
        r.revpar > 0 &&
        avgHotelRevpar > 0 &&
        r.revpar < avgHotelRevpar
      ) {
        items.push({
          level: "注意",
          store: r.store_name,
          desc: "RevPAR 低于酒店平均",
          action: "建议检查房价策略和渠道结构"
        });
      }
    }
    return items;
  }, [cockpitRows, avgHotelRevpar]);

  const lossStoreCount = useMemo(() => cockpitRows.filter((r) => r.profit < 0).length, [cockpitRows]);

  const topRevenueStores = useMemo(() => {
    const list = [...cockpitRows].filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    return list.slice(0, 5);
  }, [cockpitRows]);

  const topRevenueName = topRevenueStores[0]?.store_name ?? null;

  const topProfitStore = useMemo(() => {
    const list = [...cockpitRows].filter((r) => r.profit > 0).sort((a, b) => b.profit - a.profit);
    return list[0]?.store_name ?? null;
  }, [cockpitRows]);

  const tierCounts = useMemo(() => {
    let high = 0;
    let mid = 0;
    let low = 0;
    for (const r of cockpitRows) {
      if (r.revenue <= 0) continue;
      const m = r.profit_margin * 100;
      if (m > 15) high += 1;
      else if (m >= 5) mid += 1;
      else low += 1;
    }
    return { high, mid, low };
  }, [cockpitRows]);

  const deltaRevenue = snapshot.current.revenue - snapshot.previous.revenue;
  const deltaCost = snapshot.current.totalCost - snapshot.previous.totalCost;
  const deltaProfit = snapshot.current.profit - snapshot.previous.profit;

  const investmentHighlights = useMemo(
    () =>
      buildInvestmentHighlights({
        snapshot,
        marginPct,
        lossStoreCount,
        alertCount: alerts.length,
        highTierN: tierCounts.high,
        topRevenueName
      }),
    [snapshot, marginPct, lossStoreCount, alerts.length, tierCounts.high, topRevenueName]
  );
  const businessIntro = useMemo(() => buildBusinessPerformanceIntro(snapshot), [snapshot]);
  const revenueConclusion = useMemo(
    () => buildInvestorRevenueConclusion(snapshot, topRevenueName),
    [snapshot, topRevenueName]
  );
  const profitConclusion = useMemo(
    () =>
      buildInvestorProfitabilityConclusion(
        snapshot,
        marginPct,
        tierCounts.high,
        tierCounts.mid,
        tierCounts.low,
        occCurrent,
        revCurrent,
        hasHotelMetrics
      ),
    [snapshot, marginPct, tierCounts, occCurrent, revCurrent, hasHotelMetrics]
  );
  const driverNarrative = useMemo(
    () => buildInvestorDriverNarrative(snapshot, deltaRevenue, deltaCost, deltaProfit),
    [snapshot, deltaRevenue, deltaCost, deltaProfit]
  );
  const growthBullets = useMemo(
    () =>
      buildGrowthOpportunityBullets({
        snapshot,
        marginPct,
        tierHigh: tierCounts.high,
        tierMid: tierCounts.mid,
        revMomPct: formatPctOneDecimal(calcChange(snapshot.current.revenue, snapshot.previous.revenue)),
        topProfitStore
      }),
    [snapshot, marginPct, tierCounts.high, tierCounts.mid, topProfitStore]
  );
  const roadmap = useMemo(
    () => buildStrategicRoadmap(snapshot, marginPct, alerts, deltaProfit),
    [snapshot, marginPct, alerts, deltaProfit]
  );

  const [assetRows, setAssetRows] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    let cancelled = false;
    getActualDataRowsForPeriodWithStores(reportPeriod, storeId).then((r) => {
      if (!cancelled) setAssetRows(r as Record<string, unknown>[]);
    });
    return () => {
      cancelled = true;
    };
  }, [reportPeriod, storeId]);

  const assetScreen = useMemo(() => summarizeActualDataAssetRows(assetRows), [assetRows]);
  const leverageNarr = useMemo(() => buildOperatingLeverageNarrative(assetScreen), [assetScreen]);
  const assetOwnerNarr = useMemo(() => buildAssetQualityOwnerNarrative(assetScreen), [assetScreen]);

  const structRevSum =
    snapshot.structure.hotelRevenue +
    snapshot.structure.restaurantRevenue +
    snapshot.structure.otherRevenue;
  const barTotal = Math.max(structRevSum, snapshot.current.revenue, 1e-9);
  const pct = (v: number) => (barTotal > 0 ? formatPctOneDecimal((v / barTotal) * 100) : "—");

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Data analysis · 投融资视角</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">经营表现与增长潜力分析报告</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          本页与驾驶舱共用 cockpit 聚合与门店排行口径，侧重呈现经营表现、盈利质量、改进抓手与增长路径，便于对内对齐与对外沟通。观察窗口：{periodLabel}
          （门店范围与账期与顶部导航一致）。
        </p>
      </header>

      {/* 1. Investment Highlights */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">Investment Highlights（投资亮点）</CardTitle>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">增长与潜力导向摘要</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <p className="text-lg font-medium leading-snug text-slate-900">{investmentHighlights.tagline}</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            {investmentHighlights.bullets.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 2. Business Performance */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">Business Performance（经营表现）</CardTitle>
          <p className="text-xs text-slate-500">收入规模、结构与环比动能</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <p className="text-sm leading-relaxed text-slate-700">{businessIntro}</p>
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs text-muted-foreground">总收入（万元口径）</p>
              <p className="text-2xl font-semibold tabular-nums text-slate-900">
                {hasAggregateSignal(snapshot.current) ? formatWan(snapshot.current.revenue) : "暂无数据"}
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <span>
                酒店 <strong className="tabular-nums">{formatWan(snapshot.structure.hotelRevenue)}</strong>（
                {pct(snapshot.structure.hotelRevenue)}）
              </span>
              <span>
                餐饮 <strong className="tabular-nums">{formatWan(snapshot.structure.restaurantRevenue)}</strong>（
                {pct(snapshot.structure.restaurantRevenue)}）
              </span>
              <span>
                其他 <strong className="tabular-nums">{formatWan(snapshot.structure.otherRevenue)}</strong>（
                {pct(snapshot.structure.otherRevenue)}）
              </span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-800">Top 收入贡献门店</p>
            {topRevenueStores.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无有效收入门店样本。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>门店</TableHead>
                    <TableHead>业态</TableHead>
                    <TableHead className="text-right">收入</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRevenueStores.map((r, i) => (
                    <TableRow key={r.store_id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.store_name}</TableCell>
                      <TableCell>{r.store_type_label}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatWan(r.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <blockquote className="border-l-4 border-slate-800 pl-4 text-sm leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">叙事小结：</span>
            {revenueConclusion}
          </blockquote>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-800">环比动能拆解（本期 − 上期，与驾驶舱口径一致）</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目</TableHead>
                  <TableHead className="text-right">变动（万元）</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>收入变动</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {hasAggregateSignal(snapshot.current) ? formatWan(deltaRevenue) : "暂无数据"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>成本变动</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {hasAggregateSignal(snapshot.current) ? formatWan(deltaCost) : "暂无数据"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>利润变动</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-slate-900">
                    {hasAggregateSignal(snapshot.current) ? formatWan(deltaProfit) : "暂无数据"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">
              在「利润 ≈ 收入 − 成本」口径下，利润变动可近似拆解为收入与成本的综合结果；成本上升记为正，将阶段性影响利润表现。
            </p>
          </div>
          <blockquote className="border-l-4 border-slate-800 pl-4 text-sm leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">动能解读：</span>
            {driverNarrative}
          </blockquote>
        </CardContent>
      </Card>

      {/* 3. Profitability & Efficiency */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">Profitability &amp; Efficiency（盈利能力）</CardTitle>
          <p className="text-xs text-slate-500">聚合利润、利润率与门店分层</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs text-muted-foreground">总利润</p>
              <p className="text-2xl font-semibold tabular-nums text-slate-900">
                {hasAggregateSignal(snapshot.current) ? formatWan(snapshot.current.profit) : "暂无数据"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">综合利润率</p>
              <p className="text-2xl font-semibold tabular-nums text-slate-900">
                {hasAggregateSignal(snapshot.current) ? formatPctOneDecimal(marginPct) : "暂无数据"}
              </p>
            </div>
            {hasHotelMetrics && (
              <div className="flex gap-8 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">出租率（聚合）</p>
                  <p className="font-semibold tabular-nums">{formatPctOneDecimal(occCurrent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">RevPAR（元/间夜）</p>
                  <p className="font-semibold tabular-nums">¥ {Math.round(revCurrent)}</p>
                </div>
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-800">门店利润率分层（有收入门店）</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分层</TableHead>
                  <TableHead className="text-right">门店数</TableHead>
                  <TableHead>定义</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-emerald-800">高利润</TableCell>
                  <TableCell className="text-right tabular-nums">{tierCounts.high}</TableCell>
                  <TableCell className="text-muted-foreground">利润率 &gt; 15%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-amber-800">中等利润</TableCell>
                  <TableCell className="text-right tabular-nums">{tierCounts.mid}</TableCell>
                  <TableCell className="text-muted-foreground">5% – 15%（含边界）</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-800">效率提升潜力档</TableCell>
                  <TableCell className="text-right tabular-nums">{tierCounts.low}</TableCell>
                  <TableCell className="text-muted-foreground">利润率 &lt; 5%，具备结构性优化与爬坡空间</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <blockquote className="border-l-4 border-slate-800 pl-4 text-sm leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">叙事小结：</span>
            {profitConclusion}
          </blockquote>
        </CardContent>
      </Card>

      {/* 4. Risk & Operational Gaps */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">Risk &amp; Operational Gaps（风险与短板）</CardTitle>
          <p className="text-xs text-slate-500">与驾驶舱预警规则一致，表述面向投资人可读</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              在现有样本与规则下未触发典型扫描项；仍建议结合现场经营与现金流节奏做交叉验证，以夯实增长假设的可信度。
            </p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a, i) => (
                <li
                  key={`${a.store}-${i}-${a.desc}`}
                  className={cn(
                    "rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm leading-relaxed text-slate-800"
                  )}
                >
                  <span className="font-semibold text-slate-900">{alertPriorityLabel(a.level)}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  {alertToInvestorGap(a)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 5. Growth Opportunities */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">Growth Opportunities（增长机会）</CardTitle>
          <p className="text-xs text-slate-500">基于当期结构与梯队的潜力方向</p>
        </CardHeader>
        <CardContent className="pt-5">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            {growthBullets.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 6. Strategic Roadmap */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">Strategic Roadmap（战略路径）</CardTitle>
          <p className="text-xs text-slate-500">短期 · 中期 · 长期</p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">短期（1 个月内）</p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-700">
              {roadmap.short.map((t, i) => (
                <li key={`short-${i}`}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">中期（1–3 个月）</p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-700">
              {roadmap.mid.map((t, i) => (
                <li key={`mid-${i}`}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">长期（3 个月+）</p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-700">
              {roadmap.long.map((t, i) => (
                <li key={`long-${i}`}>{t}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 7–8. 酒店资产管理增强（依赖 actual_data 扩展字段） */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">
            Operating Leverage &amp; Cost Discipline（经营杠杆与成本纪律）
          </CardTitle>
          <p className="text-xs text-slate-500">人工成本率、能耗成本率、品牌费用、维修成本与利润承压来源</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm leading-relaxed text-slate-700">{leverageNarr}</p>
          <blockquote className="border-l-4 border-slate-300 pl-4 text-sm italic text-slate-600">
            「当前利润改善空间主要来自成本结构优化，而非单纯收入扩张。」
          </blockquote>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">
            Asset Quality &amp; Owner Control（资产质量与业主控制力）
          </CardTitle>
          <p className="text-xs text-slate-500">现金流、整改投入、竞品、差评投诉、员工流失与关键经营节点</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm leading-relaxed text-slate-700">{assetOwnerNarr}</p>
          <blockquote className="border-l-4 border-slate-300 pl-4 text-sm italic text-slate-600">
            「业主侧需要加强对品牌费用、整改节奏与关键岗位稳定性的主动管理。」
          </blockquote>
        </CardContent>
      </Card>
    </div>
  );
}
