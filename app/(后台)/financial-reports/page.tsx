"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActualExcelImportPanel } from "@/components/actual/actual-excel-import-panel";
import { FinancialTrendChart, type TrendChartMode } from "@/components/charts/financial-trend-chart";
import { BudgetImportActions } from "@/components/budget/budget-import-actions";
import { DataSourceBanner } from "@/components/common/data-source-banner";
import { DataQualityBanner } from "@/components/common/data-quality-banner";
import { MetricCard } from "@/components/common/metric-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBudgetOverrides } from "@/contexts/budget-overrides-context";
import { useBudgetDataForScope } from "@/contexts/budget-data-supabase-context";
import { resolveBudgetScopeFromQueryScope } from "@/lib/budget-scope";
import { useActualOverrides } from "@/contexts/actual-overrides-context";
import {
  financialLineFromOperatingSubjectsOnly,
  buildOperatingReportLines,
  OPERATING_REPORT_GROUP_ORDER,
  type OperatingReportLine
} from "@/lib/actual-data-subject-bridge";
import { useActualDataSupabaseForScope } from "@/contexts/actual-data-supabase-context";
import {
  getTrendSeriesFromSupabase,
  type ActualDataStoreScope,
  type BoardTypeFilter,
  type DashboardTrendPoint
} from "@/src/lib/dashboard-data-service";
import { formatStoreOptionLabel, type StoreListItem } from "@/src/lib/supabase";
import {
  getActualAggregatedByStoreIds,
  getBudgetAggregatedByStoreIds,
  formatPct,
  formatWan,
  利润表科目顺序,
  type FinancialLineActual
} from "@/lib/mock-analytics";
import {
  buildNineActualVsBudgetCards,
  buildVarianceAlerts,
  resolveActualTotals,
  resolveBudgetTotals,
  totalCostFromFinancialLine
} from "@/lib/actual-vs-budget-kpi";
import { getBudgetFinancialLinesByPeriodValues } from "@/src/lib/budget-data-service";
import { buildFullBudgetVariance } from "@/lib/budget-variance";
import { DATA_CALIBER_RULES } from "@/lib/data-caliber";
import { checkTrendQuality } from "@/lib/data-quality";
import { dbPeriodToReportPeriod, reportPeriodToDbPeriod } from "@/lib/dashboard-metrics";
import { isStoreOpenInPeriod, trendPeriodsForAllStores, trendPeriodsForSingleStore } from "@/lib/trend-periods";
import {
  ACTIVE_STORE_SCOPE_DETAIL_LABEL,
  ACTIVE_STORE_SCOPE_SHORT_LABEL,
  filterActiveMockStores
} from "@/lib/active-store-scope";
import {
  BUDGET_VERSION_OPTIONS,
  getBudgetVersionLabel
} from "@/lib/budget-versions";
import {
  createDefaultFinancialReportFilter,
  financialReportFilterPeriodLabel,
  financialReportFilterToActualDataScope,
  financialReportFilterToReportPeriod,
  financialReportScopeLabel,
  loadFinancialReportFilterFromSession,
  saveFinancialReportFilterToSession,
  sanitizeFinancialReportFilter,
  type FinancialReportFilter,
  type FinancialReportScope
} from "@/lib/financial-report-filter";
import { getHotelStores, getRestaurantStores, 门店主数据, 全部门店值 } from "@/lib/store-master";
import { useActiveStores } from "@/contexts/active-stores-context";

function resolveFinancialReportTrendQuery(filter: FinancialReportFilter): {
  storeId: string;
  boardType: BoardTypeFilter;
} {
  if (filter.reportScope === "single" && filter.storeId) {
    return { storeId: filter.storeId, boardType: "all" };
  }
  if (filter.reportScope === "hotelBoard") {
    return { storeId: 全部门店值, boardType: "hotelBoard" };
  }
  if (filter.reportScope === "restaurantBoard") {
    return { storeId: 全部门店值, boardType: "restaurantBoard" };
  }
  return { storeId: 全部门店值, boardType: "all" };
}

/** Supabase 门店 → 本地 mock id（仅用于演示利润表 mock，不用于 actual_data 查询） */
function mockIdForSupabaseStore(store: StoreListItem): string {
  const m = 门店主数据.find(
    (x) => x.门店名称 === store.name || store.name.includes(x.门店名称) || x.门店名称.includes(store.name)
  );
  return m?.id ?? store.id;
}

export default function FinancialReportsPage() {
  const router = useRouter();
  const { overrides: budgetOverrides } = useBudgetOverrides();
  const { overrides: actualOverrides, mergeActualOverrides } = useActualOverrides();

  const { stores: supabaseStores } = useActiveStores();
  const [reportFilter, setReportFilter] = useState<FinancialReportFilter>(() =>
    createDefaultFinancialReportFilter([])
  );
  const [filterHydrated, setFilterHydrated] = useState(false);
  const filterSanitized = useRef(false);
  const [chartMode, setChartMode] = useState<TrendChartMode>("实际对比预算");
  const [chartMetric, setChartMetric] = useState<"收入" | "成本" | "利润">("收入");
  const [xlsxReady, setXlsxReady] = useState(false);

  useEffect(() => {
    if ((window as unknown as { XLSX?: unknown }).XLSX) {
      setXlsxReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.async = true;
    s.onload = () => setXlsxReady(true);
    document.body.appendChild(s);
    return () => s.remove();
  }, []);

  const patchReportFilter = useCallback((patch: Partial<FinancialReportFilter>) => {
    setReportFilter((prev) => sanitizeFinancialReportFilter({ ...prev, ...patch }, supabaseStores));
  }, [supabaseStores]);

  useEffect(() => {
    if (supabaseStores.length === 0) return;
    const loaded = loadFinancialReportFilterFromSession();
    setReportFilter(
      sanitizeFinancialReportFilter(loaded ?? createDefaultFinancialReportFilter(supabaseStores), supabaseStores)
    );
    setFilterHydrated(true);
  }, [supabaseStores]);

  useEffect(() => {
    if (!filterHydrated || supabaseStores.length === 0) return;
    if (filterSanitized.current) return;
    filterSanitized.current = true;
    setReportFilter((prev) => sanitizeFinancialReportFilter(prev, supabaseStores));
  }, [filterHydrated, supabaseStores]);

  useEffect(() => {
    if (!filterHydrated) return;
    saveFinancialReportFilterToSession(reportFilter);
  }, [reportFilter, filterHydrated]);

  const reportPeriod = useMemo(
    () => financialReportFilterToReportPeriod(reportFilter),
    [reportFilter]
  );
  const periodLabel = financialReportFilterPeriodLabel(reportFilter);
  const scopeLabel = financialReportScopeLabel(reportFilter, supabaseStores);

  /** mock 演示利润表用（本地 id） */
  const scopeIds = useMemo(() => {
    if (reportFilter.reportScope === "hotelBoard") return getHotelStores().map((s) => s.id);
    if (reportFilter.reportScope === "restaurantBoard") return getRestaurantStores().map((s) => s.id);
    if (reportFilter.reportScope === "activeStores") return filterActiveMockStores().map((s) => s.id);
    const sb = supabaseStores.find((s) => s.id === reportFilter.storeId);
    return sb ? [mockIdForSupabaseStore(sb)] : [];
  }, [reportFilter, supabaseStores]);

  const actualDataStoreScope = useMemo(
    (): ActualDataStoreScope => financialReportFilterToActualDataScope(reportFilter, supabaseStores),
    [reportFilter, supabaseStores]
  );

  const actualDataPeriod = reportPeriod;

  const {
    operatingSubjects,
    budgetLabelSubjects,
    hasSupabaseEnv: hasActualDataEnv,
    hasDbRows,
    loading: actualDataLoading
  } = useActualDataSupabaseForScope(actualDataStoreScope, actualDataPeriod);

  const useDbActual = hasActualDataEnv && hasDbRows;

  const budgetScope =
    reportFilter.reportScope === "single" && reportFilter.storeId
      ? reportFilter.storeId
      : scopeIds.length === 1
        ? scopeIds[0]!
        : 全部门店值;

  const budgetScopeResolution = useMemo(
    () => resolveBudgetScopeFromQueryScope(actualDataStoreScope, supabaseStores),
    [actualDataStoreScope, supabaseStores]
  );

  const {
    budgetLine: budget,
    budgetSubjects: budgetDbSubjects,
    useDbBudget,
    hasSupabaseEnv: hasBudgetEnv,
    loading: budgetLoading,
    budgetSource,
    queryError: budgetQueryError,
    rowCount: budgetRowCount
  } = useBudgetDataForScope(reportPeriod, {
    scopeResolution: budgetScopeResolution,
    mockFallbackScope: budgetScope,
    overrides: budgetOverrides,
    budgetVersion: reportFilter.budgetVersion
  });

  const actual = useMemo(() => {
    if (useDbActual) {
      return financialLineFromOperatingSubjectsOnly(operatingSubjects);
    }
    const mockIds =
      scopeIds.length > 0 ? scopeIds : filterActiveMockStores().map((s) => s.id);
    return getActualAggregatedByStoreIds(mockIds, reportPeriod, actualOverrides);
  }, [scopeIds, reportPeriod, actualOverrides, operatingSubjects, useDbActual]);

  const variance = useMemo(() => {
    const 差异 = {} as FinancialLineActual;
    const 差异率 = {} as FinancialLineActual;
    (Object.keys(actual) as (keyof FinancialLineActual)[]).forEach((k) => {
      if (k === "利润率") {
        差异[k] = actual[k] - budget[k];
        差异率[k] = budget[k] !== 0 ? 差异[k] / budget[k] : 0;
      } else {
        差异[k] = actual[k] - budget[k];
        差异率[k] = budget[k] !== 0 ? 差异[k] / budget[k] : 0;
      }
    });
    return { 实际: actual, 预算: budget, 差异, 差异率 };
  }, [actual, budget]);

  const mockTrendData = useMemo(() => {
    const end = reportPeriodToDbPeriod({ 粒度: "month", 年: reportFilter.year, 月: reportFilter.month });
    const periods =
      reportFilter.reportScope === "single" && reportFilter.storeId
        ? trendPeriodsForSingleStore(
            end,
            reportFilter.storeId,
            supabaseStores.find((s) => s.id === reportFilter.storeId)?.name,
            6
          )
        : trendPeriodsForAllStores(
            end,
            scopeIds.map((id) => ({ store_id: id, store_name: 门店主数据.find((s) => s.id === id)?.显示名称 })),
            6
          );
    return periods
      .map((dbp) => {
        const openIds = scopeIds.filter((id) =>
          isStoreOpenInPeriod(id, 门店主数据.find((s) => s.id === id)?.显示名称, dbp.period_value)
        );
        if (!openIds.length) return null;

        const p = dbPeriodToReportPeriod(dbp);
        const a = getActualAggregatedByStoreIds(openIds, p, actualOverrides);
        const b = getBudgetAggregatedByStoreIds(openIds, p, budgetOverrides, reportFilter.budgetVersion);
        return {
          周期: dbp.period_value,
          实际收入: a.营业收入,
          预算收入: b.营业收入,
          实际成本: a.人力成本 + a.能源费用 + a.华住管理费 + a.客房服务成本 + a.非客房服务成本 + a.原材料成本,
          预算成本: b.人力成本 + b.能源费用 + b.华住管理费 + b.客房服务成本 + b.非客房服务成本 + b.原材料成本,
          实际利润: a.营业利润,
          预算利润: b.营业利润
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  }, [
    scopeIds,
    reportFilter.year,
    reportFilter.month,
    reportFilter.reportScope,
    reportFilter.storeId,
    actualOverrides,
    budgetOverrides,
    reportFilter.budgetVersion,
    supabaseStores
  ]);

  const [trendActualFromDb, setTrendActualFromDb] = useState<DashboardTrendPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTrendActualFromDb(null);
    if (!useDbActual || !hasActualDataEnv) return;

    const { storeId, boardType } = resolveFinancialReportTrendQuery(reportFilter);
    if (reportFilter.reportScope === "single" && !reportFilter.storeId) return;

    getTrendSeriesFromSupabase(storeId, boardType, reportPeriod)
      .then((list) => {
        if (!cancelled) setTrendActualFromDb(list && list.length > 0 ? list : null);
      })
      .catch(() => {
        if (!cancelled) setTrendActualFromDb(null);
      });

    return () => {
      cancelled = true;
    };
  }, [useDbActual, hasActualDataEnv, reportPeriod, reportFilter]);

  const trendPeriodValues = useMemo(() => {
    if (useDbActual && trendActualFromDb?.length) {
      return trendActualFromDb.map((p) => p.周期);
    }
    return mockTrendData.map((r) => r.周期);
  }, [useDbActual, trendActualFromDb, mockTrendData]);

  const [trendBudgetFromDb, setTrendBudgetFromDb] = useState<Record<string, FinancialLineActual> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setTrendBudgetFromDb(null);
    if (!useDbBudget || !hasBudgetEnv || budgetScopeResolution.mode === "invalid") return;
    if (!trendPeriodValues.length) return;

    getBudgetFinancialLinesByPeriodValues(
      budgetScopeResolution.queryScope,
      trendPeriodValues,
      reportFilter.budgetVersion
    )
      .then(({ byPeriod, error }) => {
        if (cancelled) return;
        if (error || Object.keys(byPeriod).length === 0) {
          setTrendBudgetFromDb(null);
          return;
        }
        setTrendBudgetFromDb(byPeriod);
      })
      .catch(() => {
        if (!cancelled) setTrendBudgetFromDb(null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    useDbBudget,
    hasBudgetEnv,
    budgetScopeResolution,
    trendPeriodValues,
    reportFilter.budgetVersion
  ]);

  const trendData = useMemo(() => {
    const mockBudgetByPeriod = new Map(mockTrendData.map((row) => [row.周期, row]));

    const resolveBudgetFields = (period: string) => {
      const dbLine = useDbBudget ? trendBudgetFromDb?.[period] : undefined;
      if (dbLine) {
        return {
          预算收入: dbLine.营业收入,
          预算成本: totalCostFromFinancialLine(dbLine),
          预算利润: dbLine.营业利润
        };
      }
      const mockRow = mockBudgetByPeriod.get(period);
      return {
        预算收入: mockRow?.预算收入 ?? 0,
        预算成本: mockRow?.预算成本 ?? 0,
        预算利润: mockRow?.预算利润 ?? 0
      };
    };

    if (useDbActual && trendActualFromDb?.length) {
      return trendActualFromDb.map((point) => ({
        周期: point.周期,
        实际收入: point.收入,
        实际成本: point.成本,
        实际利润: point.利润,
        ...resolveBudgetFields(point.周期)
      }));
    }

    return mockTrendData.map((row) => ({
      周期: row.周期,
      实际收入: row.实际收入,
      实际成本: row.实际成本,
      实际利润: row.实际利润,
      ...resolveBudgetFields(row.周期)
    }));
  }, [useDbActual, trendActualFromDb, mockTrendData, useDbBudget, trendBudgetFromDb]);

  const qualityIssues = useMemo(
    () => checkTrendQuality(trendData as Array<Record<string, unknown>>, chartMetric),
    [trendData, chartMetric]
  );

  const operatingVariance = useMemo(() => {
    const full = buildFullBudgetVariance(
      budgetScope,
      reportPeriod,
      budgetOverrides,
      actualOverrides,
      budgetLabelSubjects,
      reportFilter.budgetVersion,
      useDbBudget ? budgetDbSubjects : undefined,
      useDbBudget
    );
    const budgetMap: Record<string, number> = { ...budgetLabelSubjects };
    for (const row of full.rows) {
      budgetMap[row.label] = row.budget;
    }
    return buildOperatingReportLines(operatingSubjects, budgetMap);
  }, [
    budgetScope,
    reportPeriod,
    useDbBudget,
    budgetDbSubjects,
    budgetOverrides,
    actualOverrides,
    budgetLabelSubjects,
    operatingSubjects,
    reportFilter.budgetVersion
  ]);

  const actualVsBudgetCards = useMemo(() => {
    const a = resolveActualTotals(useDbActual, operatingSubjects, actual);
    const b = resolveBudgetTotals(budget);
    return buildNineActualVsBudgetCards(a, b);
  }, [useDbActual, operatingSubjects, actual, budget]);

  const varianceAlerts = useMemo(() => {
    const a = resolveActualTotals(useDbActual, operatingSubjects, actual);
    const b = resolveBudgetTotals(budget);
    return buildVarianceAlerts(a, b);
  }, [useDbActual, operatingSubjects, actual, budget]);

  const kpiTop = useMemo(() => {
    const tag = useDbActual ? "actual_data" : "演示";
    const os = operatingSubjects;

    if (useDbActual) {
      const wan = (label: string) =>
        os[label] != null && Number.isFinite(os[label]) ? formatWan(os[label]!) : "—";
      const profitVal = os["运营利润"] ?? os["利润"];
      return [
        { 标题: "营业收入", 数值: wan("营业收入"), 变化: tag, 趋势: "neutral" as const },
        { 标题: "总成本", 数值: wan("总成本"), 变化: tag, 趋势: "neutral" as const },
        {
          标题: "运营利润",
          数值: profitVal != null ? formatWan(profitVal) : "—",
          变化: tag,
          趋势: "neutral" as const
        },
        { 标题: "净利润", 数值: wan("净利润"), 变化: tag, 趋势: "neutral" as const },
        { 标题: "客房收入", 数值: wan("客房收入"), 变化: tag, 趋势: "neutral" as const },
        {
          标题: "已售房晚",
          数值: os["已售房晚"] != null ? String(Math.round(os["已售房晚"]!)) : "—",
          变化: tag,
          趋势: "neutral" as const
        }
      ];
    }

    const a = actual;
    return [
      { 标题: "营业收入", 数值: formatWan(a.营业收入), 变化: tag, 趋势: "neutral" as const },
      {
        标题: "总成本",
        数值: formatWan(a.人力成本 + a.能源费用 + a.华住管理费 + a.客房服务成本 + a.非客房服务成本 + a.原材料成本),
        变化: tag,
        趋势: "neutral" as const
      },
      { 标题: "运营利润", 数值: formatWan(a.营业利润), 变化: tag, 趋势: "neutral" as const },
      { 标题: "净利润", 数值: formatWan(a.营业利润), 变化: tag, 趋势: "neutral" as const },
      { 标题: "客房收入", 数值: formatWan(a.客房收入), 变化: tag, 趋势: "neutral" as const },
      { 标题: "已售房晚", 数值: "—", 变化: tag, 趋势: "neutral" as const }
    ];
  }, [actual, operatingSubjects, useDbActual]);

  const formatOperatingValue = (line: OperatingReportLine, value: number) => {
    if (line.unit === "%") {
      const pct = value <= 1 && value >= -1 ? value * 100 : value;
      return `${pct.toFixed(1)}%`;
    }
    if (line.unit === "万元" || line.unit === "元") return formatWan(value);
    if (Number.isInteger(value)) return value.toLocaleString("zh-CN");
    return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  };

  const fmt = (key: keyof FinancialLineActual, v: number) =>
    key === "利润率" ? formatPct(v) : formatWan(v);

  const viewLabel = scopeLabel;

  const exportAt = new Date().toLocaleString("zh-CN");

  type XlsxCell = { v?: string | number; t?: "s" | "n"; z?: string; s?: Record<string, unknown> };
  type XlsxSheet = Record<string, XlsxCell | string | number | boolean | object | undefined> & {
    "!cols"?: Array<{ wch: number }>;
    "!rows"?: Array<{ hpt?: number }>;
    "!freeze"?: { xSplit?: number; ySplit?: number };
    "!merges"?: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>;
    "!ref"?: string;
  };
  type XlsxRuntime = {
    utils: {
      book_new: () => unknown;
      book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
      json_to_sheet: (rows: Array<Record<string, string | number>>) => unknown;
      aoa_to_sheet: (rows: Array<Array<string | number>>) => unknown;
      sheet_add_json: (
        ws: unknown,
        rows: Array<Record<string, string | number>>,
        opts: { origin: string; skipHeader: boolean }
      ) => void;
    };
    writeFile: (wb: unknown, name: string) => void;
  };

  const headerCellStyle = {
    font: { bold: true, color: { rgb: "1E293B" } },
    fill: { fgColor: { rgb: "E2E8F0" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } }
    }
  };
  const bodyBorderStyle = {
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } }
    }
  };

  const applyHeaderStyle = (ws: XlsxSheet, rowIdx: number, colCount: number) => {
    for (let c = 0; c < colCount; c += 1) {
      const addr = `${String.fromCharCode(65 + c)}${rowIdx + 1}`;
      const cell = ws[addr] as XlsxCell | undefined;
      if (cell) {
        cell.s = { ...(cell.s ?? {}), ...headerCellStyle };
      }
    }
  };

  const styleProfitNumericCell = (cell: XlsxCell | undefined, value: number, isPercent = false) => {
    if (!cell) return;
    cell.t = "n";
    cell.v = value;
    cell.z = isPercent ? "0.00%" : "#,##0.00";
    if (value < 0) {
      cell.s = { ...(cell.s ?? {}), font: { color: { rgb: "DC2626" } }, ...bodyBorderStyle };
    } else if (!isPercent && value > 0) {
      cell.s = { ...(cell.s ?? {}), font: { color: { rgb: "065F46" } }, ...bodyBorderStyle };
    } else {
      cell.s = { ...(cell.s ?? {}), ...bodyBorderStyle };
    }
  };

  const exportExcel = () => {
    const x = (window as unknown as { XLSX?: XlsxRuntime }).XLSX;
    if (!x) {
      window.alert("导出引擎未加载完成，请稍后再试。");
      return;
    }
    const overview = [
      { 项目: "报表标题", 值: "河北沣庭酒店餐饮经营管理平台 - 财务报表" },
      { 项目: "当前视图", 值: viewLabel },
      { 项目: "账期", 值: periodLabel },
      { 项目: "导出时间", 值: exportAt },
      { 项目: "营业收入", 值: formatWan(actual.营业收入) },
      { 项目: "营业利润", 值: formatWan(actual.营业利润) },
      { 项目: "利润率", 值: formatPct(actual.利润率) }
    ];
    const profitRows = 利润表科目顺序.map(({ key, label }) => ({
      科目: label,
      实际: variance.实际[key],
      预算: variance.预算[key],
      差异: variance.差异[key],
      差异率: variance.差异率[key]
    }));
    const trendRows = [...trendData]
      .sort((a, b) => Number(a.周期.replace("月", "")) - Number(b.周期.replace("月", "")))
      .map((t) => {
        const mark = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? "缺失" : "");
        return {
          月份: t.周期,
          实际收入: t.实际收入,
          预算收入: t.预算收入,
          实际成本: t.实际成本,
          预算成本: t.预算成本,
          实际利润: t.实际利润,
          预算利润: t.预算利润,
          备注: [mark(t.实际收入), mark(t.预算收入), mark(t.实际成本), mark(t.预算成本), mark(t.实际利润), mark(t.预算利润)].filter(Boolean).join(" / ")
        };
      });

    const wb = x.utils.book_new();

    const overviewWs = x.utils.json_to_sheet(overview) as XlsxSheet;
    overviewWs["!cols"] = [{ wch: 20 }, { wch: 52 }];
    applyHeaderStyle(overviewWs, 0, 2);
    x.utils.book_append_sheet(wb, overviewWs, "概览");

    const profitTopRows = [
      ["利润表导出信息", "", "", "", ""],
      [
        "当前视图",
        viewLabel,
        "当前门店",
        scopeLabel
      ],
      ["当前账期", periodLabel, "导出时间", exportAt],
      ["KPI摘要", "", "", "", ""],
      ["营业收入", actual.营业收入, "营业利润", actual.营业利润, "利润率"],
      ["", "", "", "", actual.利润率],
      [],
      ["科目", "实际", "预算", "差异", "差异率"]
    ];
    const profitWs = x.utils.aoa_to_sheet(profitTopRows) as XlsxSheet;
    x.utils.sheet_add_json(profitWs, profitRows, { origin: "A9", skipHeader: true });
    profitWs["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }
    ];
    profitWs["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    profitWs["!freeze"] = { xSplit: 1, ySplit: 8 };
    applyHeaderStyle(profitWs, 0, 5);
    applyHeaderStyle(profitWs, 3, 5);
    applyHeaderStyle(profitWs, 7, 5);
    const startRow = 8;
    profitRows.forEach((r, idx) => {
      const row = startRow + idx + 1;
      styleProfitNumericCell(profitWs[`B${row}`] as XlsxCell | undefined, Number(r.实际), false);
      styleProfitNumericCell(profitWs[`C${row}`] as XlsxCell | undefined, Number(r.预算), false);
      styleProfitNumericCell(profitWs[`D${row}`] as XlsxCell | undefined, Number(r.差异), false);
      styleProfitNumericCell(profitWs[`E${row}`] as XlsxCell | undefined, Number(r.差异率), true);
      const subjectCell = profitWs[`A${row}`] as XlsxCell | undefined;
      if (subjectCell) subjectCell.s = { ...(subjectCell.s ?? {}), ...bodyBorderStyle };
    });
    styleProfitNumericCell(profitWs["B5"] as XlsxCell | undefined, actual.营业收入, false);
    styleProfitNumericCell(profitWs["D5"] as XlsxCell | undefined, actual.营业利润, false);
    styleProfitNumericCell(profitWs["E6"] as XlsxCell | undefined, actual.利润率, true);
    x.utils.book_append_sheet(wb, profitWs, "利润表");

    const trendWs = x.utils.json_to_sheet(
      trendRows.map((r) => ({
        月份: r.月份,
        实际收入: r.实际收入,
        预算收入: r.预算收入,
        实际成本: r.实际成本,
        预算成本: r.预算成本,
        实际利润: r.实际利润,
        预算利润: r.预算利润,
        备注: r.备注 || "正常"
      }))
    ) as XlsxSheet;
    trendWs["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    applyHeaderStyle(trendWs, 0, 8);
    trendRows.forEach((r, idx) => {
      const row = idx + 2;
      ["B", "C", "D", "E", "F", "G"].forEach((col) => {
        const cell = trendWs[`${col}${row}`] as XlsxCell | undefined;
        if (cell) {
          cell.t = "n";
          cell.z = "#,##0.00";
          cell.s = { ...(cell.s ?? {}), ...bodyBorderStyle };
        }
      });
      const noteCell = trendWs[`H${row}`] as XlsxCell | undefined;
      if (noteCell && r.备注) {
        noteCell.s = { ...(noteCell.s ?? {}), font: { color: { rgb: "B45309" } }, ...bodyBorderStyle };
      }
    });
    x.utils.book_append_sheet(wb, trendWs, "趋势数据");

    if (reportFilter.reportScope === "activeStores") {
      const detail = filterActiveMockStores().map((s) => {
        const a = getActualAggregatedByStoreIds([s.id], reportPeriod, actualOverrides);
        const b = getBudgetAggregatedByStoreIds(
          [s.id],
          reportPeriod,
          budgetOverrides,
          reportFilter.budgetVersion
        );
        return {
          业态: s.业态,
          门店: s.显示名称,
          实际营业收入: a.营业收入,
          预算营业收入: b.营业收入,
          实际营业利润: a.营业利润,
          预算营业利润: b.营业利润,
          利润率: a.利润率
        };
      });
      const hotel = detail.filter((d) => d.业态 === "酒店");
      const rest = detail.filter((d) => d.业态 === "餐饮");
      const detailRows: Array<Record<string, string | number>> = [];
      detailRows.push({ 分组: "酒店", 门店: "", 实际营业收入: "", 预算营业收入: "", 实际营业利润: "", 预算营业利润: "", 利润率: "" });
      hotel.forEach((d) => {
        detailRows.push({ 分组: "", 门店: d.门店, 实际营业收入: d.实际营业收入, 预算营业收入: d.预算营业收入, 实际营业利润: d.实际营业利润, 预算营业利润: d.预算营业利润, 利润率: d.利润率 });
      });
      detailRows.push({ 分组: "", 门店: "", 实际营业收入: "", 预算营业收入: "", 实际营业利润: "", 预算营业利润: "", 利润率: "" });
      detailRows.push({ 分组: "餐饮", 门店: "", 实际营业收入: "", 预算营业收入: "", 实际营业利润: "", 预算营业利润: "", 利润率: "" });
      rest.forEach((d) => {
        detailRows.push({ 分组: "", 门店: d.门店, 实际营业收入: d.实际营业收入, 预算营业收入: d.预算营业收入, 实际营业利润: d.实际营业利润, 预算营业利润: d.预算营业利润, 利润率: d.利润率 });
      });
      const detailWs = x.utils.json_to_sheet(detailRows) as XlsxSheet;
      detailWs["!cols"] = [{ wch: 10 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
      applyHeaderStyle(detailWs, 0, 7);
      detailRows.forEach((d, idx) => {
        const row = idx + 2;
        const groupCell = detailWs[`A${row}`] as XlsxCell | undefined;
        if (groupCell && d.分组) {
          groupCell.s = { ...(groupCell.s ?? {}), ...headerCellStyle };
        }
        ["C", "D", "E", "F"].forEach((col) => {
          const cell = detailWs[`${col}${row}`] as XlsxCell | undefined;
          if (cell && typeof cell.v === "number") {
            cell.z = "#,##0.00";
            cell.s = { ...(cell.s ?? {}), ...bodyBorderStyle };
          }
        });
        const marginCell = detailWs[`G${row}`] as XlsxCell | undefined;
        if (marginCell && typeof marginCell.v === "number") {
          marginCell.z = "0.00%";
          marginCell.s = { ...(marginCell.s ?? {}), ...bodyBorderStyle };
        }
      });
      x.utils.book_append_sheet(wb, detailWs, "分门店明细");
    }
    x.writeFile(wb, "财务报表导出.xlsx");
  };

  const exportPdf = () => {
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;
    const rows = 利润表科目顺序
      .map(({ key, label }) => `<tr><td>${label}</td><td>${fmt(key, variance.实际[key])}</td><td>${fmt(key, variance.预算[key])}</td><td>${fmt(key, variance.差异[key])}</td><td>${formatPct(variance.差异率[key])}</td></tr>`)
      .join("");
    win.document.write(`
      <html><head><title>财务报表</title>
      <style>
        body{font-family:Arial,"PingFang SC";padding:20px;color:#0f172a}
        h1{font-size:22px;margin:0 0 8px} .meta{font-size:12px;color:#475569;margin-bottom:10px}
        table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}
      </style></head><body>
      <h1>河北沣庭酒店餐饮经营管理平台 - 财务报表</h1>
      <div class="meta">视图：${viewLabel} ｜ 账期：${periodLabel} ｜ 导出时间：${exportAt}</div>
      <div class="meta">KPI：营业收入 ${formatWan(actual.营业收入)}，营业利润 ${formatWan(actual.营业利润)}，利润率 ${formatPct(actual.利润率)}</div>
      <table><thead><tr><th>科目</th><th>实际</th><th>预算</th><th>差异</th><th>差异率</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="meta" style="margin-top:10px">趋势摘要：共 ${trendData.length} 个月数据，模式 ${chartMode}，指标 ${chartMetric}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">财务报表</h1>
          <p className="text-sm text-muted-foreground">
            账期：{periodLabel} · 当前范围：{ACTIVE_STORE_SCOPE_SHORT_LABEL}（{ACTIVE_STORE_SCOPE_DETAIL_LABEL}）
          </p>
        </div>
        <Link href="/budget-management" className={cn(buttonVariants({ variant: "outline" }))}>
          进入预算管理
        </Link>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={exportExcel} disabled={!xlsxReady}>
            导出报表 Excel
          </Button>
          <Button type="button" variant="outline" onClick={exportPdf}>
            导出报表 PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">筛选与账期</CardTitle>
            <p className="text-sm text-muted-foreground">本页唯一筛选源；与顶部导航无关</p>
          </div>
          <div className="space-y-0.5 text-sm">
            <p>
              <span className="text-muted-foreground">当前期间：</span>
              <span className="font-medium">{periodLabel}</span>
            </p>
            <p>
              <span className="text-muted-foreground">当前范围：</span>
              <span className="font-medium">{scopeLabel}</span>
            </p>
            <p>
              <span className="text-muted-foreground">预算版本：</span>
              <span className="font-medium">{getBudgetVersionLabel(reportFilter.budgetVersion)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              实际：{DATA_CALIBER_RULES.operatingImportTarget} · 预算：{DATA_CALIBER_RULES.budgetManagementTarget}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">报表范围</span>
            <Select
              value={reportFilter.reportScope}
              onValueChange={(v) =>
                patchReportFilter({
                  reportScope: v as FinancialReportScope,
                  storeId: v === "single" ? reportFilter.storeId : null
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">单店利润表</SelectItem>
                <SelectItem value="activeStores">当前经营门店汇总</SelectItem>
                <SelectItem value="hotelBoard">酒店板块汇总</SelectItem>
                <SelectItem value="restaurantBoard">餐饮板块汇总</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {reportFilter.reportScope === "single" && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">门店</span>
              <Select
                value={reportFilter.storeId ?? undefined}
                onValueChange={(v) => patchReportFilter({ storeId: v, reportScope: "single" })}
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="选择门店" />
                </SelectTrigger>
                <SelectContent>
                  {supabaseStores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {formatStoreOptionLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">年份</span>
            <Select
              value={String(reportFilter.year)}
              onValueChange={(v) => patchReportFilter({ year: Number(v) })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">月份</span>
            <Select
              value={String(reportFilter.month)}
              onValueChange={(v) => patchReportFilter({ month: Number(v) })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} 月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">预算版本</span>
            <Select
              value={reportFilter.budgetVersion}
              onValueChange={(v) => patchReportFilter({ budgetVersion: v as FinancialReportFilter["budgetVersion"] })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_VERSION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataSourceBanner
        actual={{
          hasSupabaseEnv: hasActualDataEnv,
          loading: actualDataLoading,
          useDbActual,
          reportPeriod,
          scopeDescription: scopeLabel
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">实际 vs 预算（核心指标）</CardTitle>
          <p className="text-sm text-muted-foreground">
            实际来自 actual_data；预算优先 budget_data（{getBudgetVersionLabel(reportFilter.budgetVersion)}）
          </p>
        </CardHeader>
        <CardContent>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {actualVsBudgetCards.map((k) => (
              <MetricCard key={k.标题} {...k} />
            ))}
          </section>
          {varianceAlerts.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-800">
              {varianceAlerts.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpiTop.map((k) => <MetricCard key={k.标题} {...k} />)}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>经营实际数据（actual_data 全字段 vs 预算）</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!hasActualDataEnv ? (
            <p className="text-sm text-muted-foreground">
              未配置 Supabase 环境变量，下表为科目结构预览（数值来自演示/mock）。配置后请从
              <Link href="/operating-data-template" className="mx-1 text-primary underline">
                经营实际数据模板
              </Link>
              导入 actual_data。
            </p>
          ) : null}
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分组</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>实际</TableHead>
                  <TableHead>预算</TableHead>
                  <TableHead>差异</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {OPERATING_REPORT_GROUP_ORDER.map((group) => {
                  const lines = operatingVariance.filter((l) => l.group === group);
                  if (lines.length === 0) return null;
                  return (
                    <Fragment key={group}>
                      <TableRow className="bg-muted/40">
                        <TableCell colSpan={5} className="font-semibold">
                          {group}
                        </TableCell>
                      </TableRow>
                      {lines.map((line) => (
                        <TableRow key={line.label}>
                          <TableCell />
                          <TableCell className="font-medium">{line.label}</TableCell>
                          <TableCell>{formatOperatingValue(line, line.actual)}</TableCell>
                          <TableCell>{formatOperatingValue(line, line.budget)}</TableCell>
                          <TableCell>{formatOperatingValue(line, line.variance)}</TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>利润表（实际 / 预算 / 差异 / 差异率）</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>项目</TableHead><TableHead>实际</TableHead><TableHead>预算</TableHead><TableHead>差异</TableHead><TableHead>差异率</TableHead></TableRow></TableHeader>
            <TableBody>
              {利润表科目顺序.map(({ key, label }) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell>{fmt(key, variance.实际[key])}</TableCell>
                  <TableCell>{fmt(key, variance.预算[key])}</TableCell>
                  <TableCell>{fmt(key, variance.差异[key])}</TableCell>
                  <TableCell>{formatPct(variance.差异率[key])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>收入 / 成本 / 利润趋势</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={chartMode} onValueChange={(v) => setChartMode(v as TrendChartMode)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="实际对比预算">实际 vs 预算</SelectItem><SelectItem value="收入成本利润">收入 / 成本 / 利润</SelectItem></SelectContent>
            </Select>
            <Select value={chartMetric} onValueChange={(v) => setChartMetric(v as "收入" | "成本" | "利润")}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="收入">收入</SelectItem><SelectItem value="成本">成本</SelectItem><SelectItem value="利润">利润</SelectItem></SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataQualityBanner issues={qualityIssues} />
          <FinancialTrendChart data={trendData} mode={chartMode} metric={chartMetric} />
        </CardContent>
      </Card>

      <ActualExcelImportPanel
        mode="financial"
        existingOverrides={actualOverrides}
        onImport={(entries) => mergeActualOverrides(entries)}
      />

      <BudgetImportActions onManualEntry={() => router.push("/budget-management")} />
    </div>
  );
}
