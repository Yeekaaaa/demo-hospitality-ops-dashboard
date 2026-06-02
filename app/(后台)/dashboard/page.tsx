"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BossCockpitBriefingCard } from "@/components/dashboard/boss-cockpit-briefing";
import { CockpitTrendChart } from "@/components/dashboard/cockpit-trend-chart";
import { ExecutiveKpiCard } from "@/components/dashboard/executive-kpi-card";
import { MetricCard } from "@/components/common/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useActualOverrides } from "@/contexts/actual-overrides-context";
import { useStorePeriod } from "@/contexts/store-period-context";
import {
  buildMockCockpitSnapshot,
  getMockCockpitStoreRanking,
  getMockCockpitTrendSeries,
  type BoardType
} from "@/lib/dashboard-cockpit-mock";
import { exportBossOnePagerPdf } from "@/lib/dashboard-boss-onepager-pdf";
import {
  calcOccupancyRate,
  calcProfitMargin,
  calcRevPAR,
  formatPctOneDecimal,
  getPreviousReportPeriod
} from "@/lib/dashboard-metrics";
import { financialLineFromOperatingSubjectsOnly } from "@/lib/actual-data-subject-bridge";
import { cockpitSnapshotFromOperatingSubjects } from "@/lib/actual-data-cockpit-bridge";
import { ActualDataSourceHint } from "@/components/common/actual-data-source-hint";
import { dashboardToActualDataScope } from "@/lib/dashboard-actual-scope";
import { resolveBudgetScopeFromQueryScope } from "@/lib/budget-scope";
import { formatWan, getDashboardKpis } from "@/lib/mock-analytics";
import {
  buildNineActualVsBudgetCards,
  buildVarianceAlerts,
  resolveActualTotals,
  resolveBudgetTotals
} from "@/lib/actual-vs-budget-kpi";
import { DEFAULT_BUDGET_VERSION, getBudgetVersionLabel } from "@/lib/budget-versions";
import { DATA_CALIBER_RULES } from "@/lib/data-caliber";
import { BudgetDataSourceHint } from "@/components/common/budget-data-source-hint";
import { useBudgetOverrides } from "@/contexts/budget-overrides-context";
import { useBudgetDataForScope } from "@/contexts/budget-data-supabase-context";
import { useActualDataSupabaseForScope } from "@/contexts/actual-data-supabase-context";
import { useActiveStores } from "@/contexts/active-stores-context";
import {
  ACTIVE_STORE_SCOPE_DETAIL_LABEL,
  ACTIVE_STORE_SCOPE_SHORT_LABEL,
  filterActiveMockStores
} from "@/lib/active-store-scope";
import { 全部门店值 } from "@/lib/store-master";
import { cn } from "@/lib/utils";
import {
  getCockpitSnapshotFromSupabase,
  getStoreCockpitRankingFromSupabase,
  getTrendSeriesFromSupabase,
  type CockpitSnapshot,
  type CockpitStoreRankingRow,
  type DashboardTrendPoint
} from "@/src/lib/dashboard-data-service";

function mockAnalyticsStoreScope(storeId: string): string {
  if (storeId === 全部门店值) return storeId;
  if (filterActiveMockStores().some((s) => s.id === storeId)) return storeId;
  return 全部门店值;
}

type RankingBoardScope = "all" | "hotelBoard" | "restaurantBoard";

function resolveRankingBoardScope(
  boardType: BoardType,
  rankGroup: "all" | "hotel" | "restaurant"
): RankingBoardScope | null {
  const rankGroupScope: RankingBoardScope =
    rankGroup === "hotel" ? "hotelBoard" : rankGroup === "restaurant" ? "restaurantBoard" : "all";

  if (boardType === "all") return rankGroupScope;
  if (rankGroupScope === "all") return boardType;
  if (boardType === rankGroupScope) return boardType;
  return null;
}

type RankTab = "revenue" | "profit" | "margin";

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

export default function DashboardPage() {
  const { storeId, reportPeriod, periodLabel, periodGranularity } = useStorePeriod();
  const { overrides: actualOverrides } = useActualOverrides();
  const { overrides: budgetOverrides } = useBudgetOverrides();
  const { stores: supabaseStores } = useActiveStores();
  const [boardType, setBoardType] = useState<BoardType>("all");
  const [rankGroup, setRankGroup] = useState<"all" | "hotel" | "restaurant">("all");
  const [rankTab, setRankTab] = useState<RankTab>("profit");

  const actualDataScope = useMemo(
    () => dashboardToActualDataScope(storeId, boardType, supabaseStores),
    [storeId, boardType, supabaseStores]
  );

  const actualDataScopeLabel = useMemo(() => {
    if (typeof actualDataScope === "string") {
      const s = supabaseStores.find((x) => x.id === actualDataScope);
      return s ? `${s.name}（${actualDataScope.slice(0, 8)}…）` : actualDataScope;
    }
    if (Array.isArray(actualDataScope)) {
      return `${actualDataScope.length} 家门店（${boardType === "hotelBoard" ? "酒店板块" : boardType === "restaurantBoard" ? "餐饮板块" : "经营门店"}）`;
    }
    return "—";
  }, [actualDataScope, supabaseStores, boardType]);

  const {
    operatingSubjects,
    hasSupabaseEnv: hasActualDataEnv,
    hasDbRows,
    loading: actualDataLoading
  } = useActualDataSupabaseForScope(actualDataScope, reportPeriod);

  const useDbActual = hasActualDataEnv && hasDbRows;

  const mockKpisScope = useMemo(() => mockAnalyticsStoreScope(storeId), [storeId]);

  const budgetScopeResolution = useMemo(
    () => resolveBudgetScopeFromQueryScope(actualDataScope, supabaseStores),
    [actualDataScope, supabaseStores]
  );

  const {
    budgetLine,
    useDbBudget,
    hasSupabaseEnv: hasBudgetEnv,
    loading: budgetLoading,
    budgetSource,
    queryError: budgetQueryError,
    rowCount: budgetRowCount
  } = useBudgetDataForScope(reportPeriod, {
    scopeResolution: budgetScopeResolution,
    mockFallbackScope: mockKpisScope,
    overrides: budgetOverrides,
    budgetVersion: DEFAULT_BUDGET_VERSION
  });
  const kpis = useMemo(
    () => getDashboardKpis(mockKpisScope, reportPeriod, actualOverrides),
    [mockKpisScope, reportPeriod, actualOverrides]
  );

  const prevReportPeriod = useMemo(() => getPreviousReportPeriod(reportPeriod), [reportPeriod]);

  const rankingBoardScope = useMemo(
    () => resolveRankingBoardScope(boardType, rankGroup),
    [boardType, rankGroup]
  );

  const [cockpitFromDb, setCockpitFromDb] = useState<CockpitSnapshot | null>(null);
  useEffect(() => {
    let cancelled = false;
    setCockpitFromDb(null);
    getCockpitSnapshotFromSupabase(storeId, boardType, reportPeriod)
      .then((row) => {
        if (!cancelled) setCockpitFromDb(row);
      })
      .catch(() => {
        if (!cancelled) setCockpitFromDb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, boardType, reportPeriod]);

  const mockSnapshot = useMemo(
    () => buildMockCockpitSnapshot(storeId, boardType, reportPeriod, actualOverrides),
    [storeId, boardType, reportPeriod, actualOverrides]
  );

  const snapshotFromSubjects = useMemo(() => {
    if (!useDbActual || Object.keys(operatingSubjects).length === 0) return null;
    return cockpitSnapshotFromOperatingSubjects(operatingSubjects);
  }, [useDbActual, operatingSubjects]);

  const snapshot = cockpitFromDb ?? snapshotFromSubjects ?? mockSnapshot ?? emptySnapshot();
  const snapshotUsesSupabase = cockpitFromDb != null || (useDbActual && snapshotFromSubjects != null);

  const bossActualVsBudget = useMemo(() => {
    const mockLine = financialLineFromOperatingSubjectsOnly({});
    const actual = resolveActualTotals(useDbActual, operatingSubjects, mockLine);
    const budget = resolveBudgetTotals(budgetLine);
    return {
      cards: buildNineActualVsBudgetCards(actual, budget),
      alerts: buildVarianceAlerts(actual, budget)
    };
  }, [useDbActual, operatingSubjects, budgetLine]);

  const [trendFromDb, setTrendFromDb] = useState<DashboardTrendPoint[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getTrendSeriesFromSupabase(storeId, boardType, reportPeriod);
        if (cancelled) return;
        setTrendFromDb(list && list.length > 0 ? list : null);
      } catch {
        if (!cancelled) setTrendFromDb(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, boardType, reportPeriod]);

  const mockTrend = useMemo(
    () => getMockCockpitTrendSeries(storeId, boardType, reportPeriod, actualOverrides),
    [storeId, boardType, reportPeriod, actualOverrides]
  );
  const trend = trendFromDb ?? (useDbActual ? [] : mockTrend);

  const [cockpitRankingDb, setCockpitRankingDb] = useState<CockpitStoreRankingRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (rankingBoardScope == null) {
      setCockpitRankingDb(null);
      return;
    }
    getStoreCockpitRankingFromSupabase(reportPeriod, rankingBoardScope)
      .then((rows) => {
        if (!cancelled) setCockpitRankingDb(rows && rows.length ? rows : null);
      })
      .catch(() => {
        if (!cancelled) setCockpitRankingDb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reportPeriod, rankingBoardScope]);

  const cockpitRows = useMemo(() => {
    if (cockpitRankingDb && cockpitRankingDb.length > 0) return cockpitRankingDb;
    return getMockCockpitStoreRanking(
      storeId,
      boardType,
      rankGroup,
      reportPeriod,
      prevReportPeriod,
      actualOverrides
    );
  }, [
    cockpitRankingDb,
    storeId,
    boardType,
    rankGroup,
    reportPeriod,
    prevReportPeriod,
    actualOverrides
  ]);

  const sortedCockpitRows = useMemo(() => {
    const list = [...cockpitRows];
    if (rankTab === "revenue") list.sort((a, b) => b.revenue - a.revenue);
    else if (rankTab === "profit") list.sort((a, b) => b.profit - a.profit);
    else list.sort((a, b) => b.profit_margin - a.profit_margin);
    return list;
  }, [cockpitRows, rankTab]);

  const marginPct = calcProfitMargin(snapshot.current.revenue, snapshot.current.profit);
  const prevMarginPct = calcProfitMargin(snapshot.previous.revenue, snapshot.previous.profit);
  const yoyMarginPct = calcProfitMargin(snapshot.yearAgo.revenue, snapshot.yearAgo.profit);

  const occCurrent = calcOccupancyRate(snapshot.current.roomsSold, snapshot.current.roomsAvailable);
  const occPrev = calcOccupancyRate(snapshot.previous.roomsSold, snapshot.previous.roomsAvailable);
  const occYa = calcOccupancyRate(snapshot.yearAgo.roomsSold, snapshot.yearAgo.roomsAvailable);

  const revCurrent =
    snapshot.current.roomsAvailable > 0 ? calcRevPAR(snapshot.current.roomRevenueWan, snapshot.current.roomsAvailable) : 0;
  const revPrev =
    snapshot.previous.roomsAvailable > 0 ? calcRevPAR(snapshot.previous.roomRevenueWan, snapshot.previous.roomsAvailable) : 0;
  const revYa =
    snapshot.yearAgo.roomsAvailable > 0 ? calcRevPAR(snapshot.yearAgo.roomRevenueWan, snapshot.yearAgo.roomsAvailable) : 0;

  const hotelRevparList = useMemo(
    () => cockpitRows.filter((r) => r.store_type_label === "酒店" && r.revpar != null && r.revpar > 0),
    [cockpitRows]
  );
  const avgHotelRevpar = useMemo(() => {
    if (!hotelRevparList.length) return 0;
    return hotelRevparList.reduce((s, r) => s + (r.revpar ?? 0), 0) / hotelRevparList.length;
  }, [hotelRevparList]);

  const alerts = useMemo(() => {
    const items: { level: "严重" | "注意"; store: string; desc: string; action: string }[] = [];
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

  const profitConclusion = useMemo(() => {
    if (snapshot.current.profit < 0) return "当前整体亏损，应立即复盘收入、成本与门店经营结构";
    if (marginPct > 15) return "整体盈利能力较好";
    if (marginPct >= 5) return "整体盈利能力一般，需要关注成本效率";
    return "盈利能力偏弱，应优先排查亏损门店和高成本项";
  }, [snapshot, marginPct]);

  const scopeLabel =
    boardType === "all" ? "全部门店" : boardType === "hotelBoard" ? "酒店看板" : "餐饮看板";

  const structRevSum =
    snapshot.structure.hotelRevenue +
    snapshot.structure.restaurantRevenue +
    snapshot.structure.otherRevenue;
  const barRevTotal = Math.max(structRevSum, 1e-9);

  const structCostSum =
    snapshot.structure.hotelCost + snapshot.structure.restaurantCost + snapshot.structure.otherCost;
  const barCostTotal = Math.max(structCostSum, 1e-9);

  const pctOf = (part: number, total: number) =>
    total > 0 ? Math.min(100, Math.max(0, (part / total) * 100)) : 0;
  const revHotelPct = pctOf(snapshot.structure.hotelRevenue, barRevTotal);
  const revRestPct = pctOf(snapshot.structure.restaurantRevenue, barRevTotal);
  const revOtherPct = Math.max(0, 100 - revHotelPct - revRestPct);
  const costHotelPct = pctOf(snapshot.structure.hotelCost, barCostTotal);
  const costRestPct = pctOf(snapshot.structure.restaurantCost, barCostTotal);
  const costOtherPct = Math.max(0, 100 - costHotelPct - costRestPct);

  const showOccRevpar = boardType !== "restaurantBoard";

  const handleExportBossOnePager = useCallback(() => {
    exportBossOnePagerPdf({
      periodLabel,
      scopeLabel,
      periodGranularity,
      snapshot,
      marginPct,
      prevMarginPct,
      yoyMarginPct,
      occCurrent,
      occPrev,
      occYa,
      revCurrent,
      revPrev,
      revYa,
      showOccRevpar,
      cockpitRows,
      alerts,
      profitConclusion
    });
  }, [
    periodLabel,
    scopeLabel,
    periodGranularity,
    snapshot,
    marginPct,
    prevMarginPct,
    yoyMarginPct,
    occCurrent,
    occPrev,
    occYa,
    revCurrent,
    revPrev,
    revYa,
    showOccRevpar,
    cockpitRows,
    alerts,
    profitConclusion
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">经营驾驶舱</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              面向老板的收入、利润、效率与风险总览 · 当前范围：{ACTIVE_STORE_SCOPE_SHORT_LABEL}（
              {ACTIVE_STORE_SCOPE_DETAIL_LABEL}）
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={handleExportBossOnePager}
            >
              导出老板一页纸
            </Button>
            <div className="w-[160px] min-w-[140px]">
              <Select value={boardType} onValueChange={(v) => setBoardType(v as BoardType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部门店</SelectItem>
                  <SelectItem value="hotelBoard">酒店看板</SelectItem>
                  <SelectItem value="restaurantBoard">餐饮看板</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          门店范围：{scopeLabel} · 当前账期：{periodLabel}（门店与月/季/年粒度请在顶部导航选择）
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {DATA_CALIBER_RULES.dashboardRead}（{getBudgetVersionLabel(DEFAULT_BUDGET_VERSION)}）
        </p>
        <ActualDataSourceHint
          className="mt-2"
          hasSupabaseEnv={hasActualDataEnv}
          loading={actualDataLoading}
          useDbActual={useDbActual}
          reportPeriod={reportPeriod}
          scopeDescription={actualDataScopeLabel}
        />
        <BudgetDataSourceHint
          className="mt-1"
          hasSupabaseEnv={hasBudgetEnv}
          loading={budgetLoading}
          scopeMode={budgetScopeResolution.mode}
          useDbBudget={useDbBudget}
          budgetSource={budgetSource}
          singleStoreId={budgetScopeResolution.singleStoreId}
          queryError={budgetQueryError}
          rowCount={budgetRowCount}
          invalidReason={budgetScopeResolution.invalidReason}
          reportPeriod={reportPeriod}
          scopeDescription={budgetScopeResolution.scopeLabel}
        />
        {snapshotUsesSupabase ? (
          <p className="mt-1 text-xs text-emerald-800">
            收入/利润/出租率/RevPAR 等指标已按 actual_data 聚合
            {cockpitFromDb ? "（含环比/同比多期）" : "（仅当期科目，环比/同比需多期数据）"}。
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">本期实际 vs 预算目标</CardTitle>
          <p className="text-sm text-muted-foreground">
            实际：{useDbActual ? "Supabase actual_data" : "Mock demo data"} · 预算：
            {useDbBudget ? "Supabase budget_data" : "budget_overrides / Mock"}（
            {getBudgetVersionLabel(DEFAULT_BUDGET_VERSION)}，不写入 actual_data）
          </p>
        </CardHeader>
        <CardContent>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bossActualVsBudget.cards.map((k) => (
              <MetricCard key={k.标题} {...k} />
            ))}
          </section>
          {bossActualVsBudget.alerts.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm font-medium text-amber-900">偏差预警</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
                {bossActualVsBudget.alerts.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ExecutiveKpiCard
          title="总收入"
          value={formatWan(snapshot.current.revenue)}
          current={snapshot.current.revenue}
          previous={snapshot.previous.revenue}
          yearAgo={snapshot.yearAgo.revenue}
          granularity={periodGranularity}
        />
        <ExecutiveKpiCard
          title="总利润"
          value={formatWan(snapshot.current.profit)}
          current={snapshot.current.profit}
          previous={snapshot.previous.profit}
          yearAgo={snapshot.yearAgo.profit}
          granularity={periodGranularity}
        />
        <ExecutiveKpiCard
          title="利润率"
          value={formatPctOneDecimal(marginPct)}
          current={marginPct}
          previous={prevMarginPct}
          yearAgo={yoyMarginPct}
          granularity={periodGranularity}
        />
        {showOccRevpar ? (
          <>
            <ExecutiveKpiCard
              title="出租率"
              value={
                snapshot.current.roomsAvailable > 0 ? formatPctOneDecimal(occCurrent) : "—"
              }
              current={occCurrent}
              previous={occPrev}
              yearAgo={occYa}
              granularity={periodGranularity}
            />
            <ExecutiveKpiCard
              title="RevPAR"
              value={
                snapshot.current.roomsAvailable > 0 ? `¥ ${Math.round(revCurrent)}` : "—"
              }
              current={revCurrent}
              previous={revPrev}
              yearAgo={revYa}
              granularity={periodGranularity}
            />
          </>
        ) : (
          <>
            <ExecutiveKpiCard
              title="出租率"
              value="—"
              current={0}
              previous={0}
              yearAgo={0}
              granularity={periodGranularity}
            />
            <ExecutiveKpiCard
              title="RevPAR"
              value="—"
              current={0}
              previous={0}
              yearAgo={0}
              granularity={periodGranularity}
            />
          </>
        )}
      </section>

      <BossCockpitBriefingCard
        periodLabel={periodLabel}
        scopeLabel={scopeLabel}
        snapshot={snapshot}
        marginPct={marginPct}
        rankingRows={cockpitRows}
        alerts={alerts}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          标题="库存预警"
          数值={`${kpis.库存预警条数} 条`}
          变化="含低库存与临期"
          趋势="neutral"
        />
        <MetricCard
          标题="待审批"
          数值={`${kpis.待审批项} 项`}
          变化="报销 / 采购 / 请假"
          趋势="neutral"
        />
        <MetricCard
          标题="今日在岗人数"
          数值={`${kpis.今日在岗} 人`}
          变化="含酒店与餐饮一线"
          趋势="neutral"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">收入 / 成本 / 利润趋势（近 6 个账期 · 实际）</CardTitle>
          </CardHeader>
          <CardContent>
            <CockpitTrendChart data={trend} />
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">库存与审批摘要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-relaxed">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              西北赋：调味品批次临期 3 批，建议优先出库。
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
              沐家·全季槐安西：布草低于安全库存，已生成补货建议。
            </div>
            <div className="rounded-md bg-secondary p-3 text-muted-foreground">
              待审批：报销 2 单、采购申请 2 单、请假 1 单，预计今日内处理完毕。
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <CardTitle className="text-base font-medium">门店赚钱能力排行榜</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                {(
                  [
                    ["revenue", "收入排名"],
                    ["profit", "利润排名"],
                    ["margin", "利润率排名"]
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={rankTab === key ? "default" : "ghost"}
                    size="sm"
                    className="h-9 px-3 text-sm"
                    onClick={() => setRankTab(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Select value={rankGroup} onValueChange={(v) => setRankGroup(v as typeof rankGroup)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部门店</SelectItem>
                  <SelectItem value="hotel">酒店</SelectItem>
                  <SelectItem value="restaurant">餐饮</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {storeId !== 全部门店值 && (
            <p className="mb-3 rounded-md bg-secondary px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
              当前顶部筛选为单门店，本表仍按左侧分组展示多店对比（与看板门店范围叠加）。
            </p>
          )}
          {rankingBoardScope == null && (
            <p className="mb-3 text-base leading-relaxed text-amber-800">当前看板与门店分组无交集，暂无排名数据。</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>门店</TableHead>
                <TableHead>业态</TableHead>
                <TableHead>收入</TableHead>
                <TableHead>利润</TableHead>
                <TableHead>利润率</TableHead>
                <TableHead>利润环比</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCockpitRows.map((row, idx) => (
                <TableRow key={row.store_id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">{row.store_name}</TableCell>
                  <TableCell>{row.store_type_label}</TableCell>
                  <TableCell>{formatWan(row.revenue)}</TableCell>
                  <TableCell>{formatWan(row.profit)}</TableCell>
                  <TableCell>{formatPctOneDecimal(row.profit_margin * 100)}</TableCell>
                  <TableCell
                    className={cn(
                      row.mom_profit_change_pct > 0.1 && "text-emerald-600",
                      row.mom_profit_change_pct < -0.1 && "text-red-600"
                    )}
                  >
                    {formatPctOneDecimal(row.mom_profit_change_pct)}
                  </TableCell>
                  <TableCell>
                    {row.profit < 0 ? (
                      <span className="font-medium text-red-600">亏损</span>
                    ) : (
                      <span className="font-medium text-emerald-600">盈利</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">异常预警</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-base leading-relaxed text-muted-foreground">本期未触发自动预警规则。</p>
          ) : (
            alerts.map((a, i) => (
              <div
                key={`${a.store}-${i}-${a.desc}`}
                className={cn(
                  "rounded-md border px-3 py-3 text-base leading-snug",
                  a.level === "严重" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-950"
                )}
              >
                <span className="text-sm font-medium">{a.level}</span>
                <span className="mx-1 text-muted-foreground">｜</span>
                <span className="font-medium">{a.store}</span>
                <span className="mx-1 text-muted-foreground">｜</span>
                {a.desc}
                <span className="mx-1 text-muted-foreground">｜</span>
                {a.action}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">利润拆解</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm text-muted-foreground">总收入</p>
              <p className="text-xl font-semibold tracking-tight">{formatWan(snapshot.current.revenue)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm text-muted-foreground">总成本</p>
              <p className="text-xl font-semibold tracking-tight">{formatWan(snapshot.current.totalCost)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm text-muted-foreground">总利润</p>
              <p className="text-xl font-semibold tracking-tight">{formatWan(snapshot.current.profit)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-sm text-muted-foreground">利润率</p>
              <p className="text-xl font-semibold tracking-tight">{formatPctOneDecimal(marginPct)}</p>
            </div>
          </div>
          <p className="rounded-md border border-slate-200 bg-white px-4 py-3.5 text-base leading-7 text-slate-800">
            <span className="font-semibold text-slate-700">经营结论：</span>
            {profitConclusion}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">收入结构（酒店 / 餐饮 / 其他）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-9 overflow-hidden rounded-md bg-slate-100">
              <div
                className="flex shrink-0 items-center justify-center bg-blue-600 text-sm font-medium text-white"
                style={{ width: `${revHotelPct}%` }}
              >
                {revHotelPct > 12 ? "酒店" : ""}
              </div>
              <div
                className="flex shrink-0 items-center justify-center bg-emerald-600 text-sm font-medium text-white"
                style={{ width: `${revRestPct}%` }}
              >
                {revRestPct > 12 ? "餐饮" : ""}
              </div>
              <div
                className="flex shrink-0 items-center justify-center bg-slate-400 text-sm font-medium text-white"
                style={{ width: `${revOtherPct}%` }}
              >
                {revOtherPct > 8 ? "其他" : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-base leading-relaxed">
              <span>酒店 {formatWan(snapshot.structure.hotelRevenue)}</span>
              <span>餐饮 {formatWan(snapshot.structure.restaurantRevenue)}</span>
              <span>其他 {formatWan(snapshot.structure.otherRevenue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">成本结构（酒店 / 餐饮 / 其他）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-9 overflow-hidden rounded-md bg-slate-100">
              <div
                className="flex shrink-0 items-center justify-center bg-orange-600 text-sm font-medium text-white"
                style={{ width: `${costHotelPct}%` }}
              >
                {costHotelPct > 12 ? "酒店" : ""}
              </div>
              <div
                className="flex shrink-0 items-center justify-center bg-amber-600 text-sm font-medium text-white"
                style={{ width: `${costRestPct}%` }}
              >
                {costRestPct > 12 ? "餐饮" : ""}
              </div>
              <div
                className="flex shrink-0 items-center justify-center bg-slate-400 text-sm font-medium text-white"
                style={{ width: `${costOtherPct}%` }}
              >
                {costOtherPct > 8 ? "其他" : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-base leading-relaxed">
              <span>酒店 {formatWan(snapshot.structure.hotelCost)}</span>
              <span>餐饮 {formatWan(snapshot.structure.restaurantCost)}</span>
              <span>其他 {formatWan(snapshot.structure.otherCost)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 border-dashed bg-slate-50/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800">数据口径说明</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            与当前页 KPI、趋势及排行一致，便于会上对齐口径；金额除 RevPAR 外均为万元。
          </p>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-slate-700">
          <ul className="list-disc space-y-3 pl-5 marker:text-slate-400">
            <li>
              <span className="font-medium text-slate-800">金额单位：</span>
              营业收入、成本、利润及结构拆分等，单位均为
              <span className="font-medium"> 万元（¥） </span>
              ，与卡片「¥…万」一致；RevPAR 单独标注为元/间夜。
            </li>
            <li>
              <span className="font-medium text-slate-800">收入：</span>
              在顶部所选账期、门店范围及本页酒店/餐饮筛选下，对各门店填报的「营业收入」字段求和；无法识别的数值按 0 计。
            </li>
            <li>
              <span className="font-medium text-slate-800">总成本：</span>
              同上范围内，按系统内实际成本相关字段汇总（含分项合计）；缺失或非数字按 0 计。
            </li>
            <li>
              <span className="font-medium text-slate-800">利润：</span>
              优先取各店「利润」字段汇总；若无则按「收入 − 总成本」推算。
            </li>
            <li>
              <span className="font-medium text-slate-800">利润率：</span>
              总利润 ÷ 总收入 × 100%；总收入为 0 时记为 0%。
            </li>
            <li>
              <span className="font-medium text-slate-800">出租率：</span>
              已售房晚数 ÷ 可售房晚数 × 100%；可售房晚为 0 时记为 0%。餐饮看板不展示此项。
            </li>
            <li>
              <span className="font-medium text-slate-800">RevPAR：</span>
              客房收入（万元）× 10,000 ÷ 可售房晚数，得到平均每间可售房每晚带来的客房收入，单位为元/间夜；可售房晚为 0 时不计算。
            </li>
            <li>
              <span className="font-medium text-slate-800">环比：</span>
              （本期值 − 上一账期值）÷ |上一账期值| × 100%。两期均为 0 视为 0%；仅上期为 0 而本期非 0 时记为 100%。年度视图下列表中的「环比」文案为「较上年」，计算方式相同。
            </li>
            <li>
              <span className="font-medium text-slate-800">同比：</span>
              （本期值 − 去年同期账期值）÷ |去年同期值| × 100%，零分母规则与环比相同。
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
