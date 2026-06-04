"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BudgetImportActions } from "@/components/budget/budget-import-actions";
import { BudgetExcelImportPanel } from "@/components/budget/budget-excel-import-panel";
import { DataSourceBanner } from "@/components/common/data-source-banner";
import { DataQualityBanner } from "@/components/common/data-quality-banner";
import { FinancialTrendChart, type TrendChartMode, type TrendChartMetric } from "@/components/charts/financial-trend-chart";
import { MetricCard } from "@/components/common/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBudgetOverrides } from "@/contexts/budget-overrides-context";
import { useBudgetDataForScope } from "@/contexts/budget-data-supabase-context";
import { useActualOverrides } from "@/contexts/actual-overrides-context";
import { useActualDataSupabaseForScope } from "@/contexts/actual-data-supabase-context";
import {
  formatPct,
  formatWan,
  getAnnualCompletion,
  getBudgetManagementSummary,
  getQuarterlyBudgetSummary,
  getStoreBudgetDeviationRank
} from "@/lib/mock-analytics";
import {
  buildFullBudgetVariance,
  formatBudgetDisplayValue,
  getBudgetTrendSeries,
  isRowAbnormal,
  type BudgetVarianceRow
} from "@/lib/budget-variance";
import type { BudgetOverrideMap, BudgetSubjectValueMap } from "@/lib/budget-overrides";
import {
  BUDGET_VERSION_OPTIONS,
  getBudgetVersionLabel,
  type BudgetVersionValue
} from "@/lib/budget-versions";
import {
  subjectMatchesGroupFilter,
  type BudgetGroupFilter,
  type BudgetSubjectGroup
} from "@/lib/budget-subjects";
import { normalizeBudgetSubjectDraft } from "@/lib/budget-canonical";
import {
  BUDGET_MANAGEMENT_GROUP_ORDER,
  filterDraftToManagementCatalog,
  getBudgetManagementSubjectCatalog,
  stripHiddenLegacyBudgetLabels
} from "@/lib/budget-management-catalog";
import { ACTIVE_STORE_SCOPE_DETAIL_LABEL } from "@/lib/active-store-scope";
import {
  budgetMockFallbackScope,
  describeBudgetQueryTarget,
  isBudgetSingleStoreFilter,
  resolveBudgetScopeForFilter
} from "@/lib/budget-scope";
import { DATA_CALIBER_RULES } from "@/lib/data-caliber";
import {
  type BudgetFilter,
  type BudgetQuarter,
  budgetFilterPeriodLabel,
  budgetFilterToReportPeriod,
  createDefaultBudgetFilter,
  loadBudgetFilterFromSession,
  normalizeBudgetFilter,
  quarterFromMonth,
  sanitizeBudgetFilterWithActiveStores,
  saveBudgetFilterToSession
} from "@/lib/budget-filter";
import { useActiveStores } from "@/contexts/active-stores-context";
import { checkTrendQuality } from "@/lib/data-quality";
import { 全部门店值 } from "@/lib/store-master";
import { cn } from "@/lib/utils";
import { formatStoreOptionLabel } from "@/src/lib/supabase";
import {
  saveBudgetDraftToSupabase,
  syncBudgetOverridesToSupabase
} from "@/src/lib/budget-import-to-supabase";
import { hasSupabaseBudgetEnv } from "@/src/lib/budget-data-service";
import {
  BUDGET_DATA_CALIBER_USER_HINT,
  budgetImportStatusLocalOnly,
  budgetImportStatusPartialSync,
  budgetImportStatusSynced,
  budgetSaveStatusAggregateScope,
  budgetSaveStatusDatabaseWriteFailed,
  budgetSaveStatusNoDatabase,
  budgetSaveStatusSavedToDatabase
} from "@/lib/metric-source-labels";

const GROUP_FILTERS: BudgetGroupFilter[] = ["全部", "收入", "酒店运营", "成本", "利润"];

const PERIOD_TYPE_OPTIONS = [
  { label: "本月", value: "month" as const },
  { label: "本季度", value: "quarter" as const },
  { label: "本年", value: "year" as const }
];

const QUARTER_OPTIONS: BudgetQuarter[] = ["Q1", "Q2", "Q3", "Q4"];

const BUDGET_MANAGEMENT_CATALOG = getBudgetManagementSubjectCatalog();
const FULL_BUDGET_CATALOG = BUDGET_MANAGEMENT_CATALOG;

function catalogKind(label: string) {
  return FULL_BUDGET_CATALOG.find((s) => s.label === label)?.kind ?? "wan";
}

function rowVarianceClass(row: BudgetVarianceRow): string {
  if (row.statusTone === "good") return "text-emerald-700";
  if (row.statusTone === "bad") return "text-red-600 font-medium";
  return "";
}

function orderedGroups(): BudgetSubjectGroup[] {
  return BUDGET_MANAGEMENT_GROUP_ORDER.filter((g) =>
    BUDGET_MANAGEMENT_CATALOG.some((s) => s.group === g)
  );
}

export default function BudgetManagementPage() {
  const { stores: supabaseStores, loading: storesLoading } = useActiveStores();
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>(() => createDefaultBudgetFilter([]));
  const [filterHydrated, setFilterHydrated] = useState(false);
  const storesSanitized = useRef(false);

  const {
    overrides,
    mergeBudgetOverrides,
    clearAllBudgetOverrides,
    clearBudgetOverride,
    setBudgetOverride
  } = useBudgetOverrides();
  const { overrides: actualOverrides } = useActualOverrides();

  const editorRef = useRef<HTMLDivElement | null>(null);
  const importRef = useRef<HTMLDivElement | null>(null);

  const patchBudgetFilter = useCallback((patch: Partial<BudgetFilter>) => {
    setBudgetFilter((prev) => normalizeBudgetFilter({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (storesLoading) return;
    setBudgetFilter(loadBudgetFilterFromSession(supabaseStores));
    setFilterHydrated(true);
  }, [storesLoading, supabaseStores]);

  useEffect(() => {
    if (!filterHydrated || storesLoading || supabaseStores.length === 0) return;
    if (storesSanitized.current) return;
    storesSanitized.current = true;
    setBudgetFilter((prev) => sanitizeBudgetFilterWithActiveStores(prev, supabaseStores));
  }, [filterHydrated, storesLoading, supabaseStores]);

  useEffect(() => {
    if (!filterHydrated) return;
    saveBudgetFilterToSession(budgetFilter);
  }, [budgetFilter, filterHydrated]);

  const reportPeriod = useMemo(() => budgetFilterToReportPeriod(budgetFilter), [budgetFilter]);

  const budgetScopeResolution = useMemo(
    () => resolveBudgetScopeForFilter(budgetFilter, supabaseStores),
    [budgetFilter, supabaseStores]
  );

  const actualDataScope = budgetScopeResolution.queryScope;
  const mockFallbackScope = useMemo(() => budgetMockFallbackScope(budgetFilter), [budgetFilter]);
  const budgetQueryTarget = useMemo(
    () =>
      describeBudgetQueryTarget(
        budgetScopeResolution,
        reportPeriod,
        budgetFilter.budgetVersion
      ),
    [budgetScopeResolution, reportPeriod, budgetFilter.budgetVersion]
  );

  const { budgetLabelSubjects, hasSupabaseEnv, loading: actualDataLoading, hasDbRows } =
    useActualDataSupabaseForScope(actualDataScope, reportPeriod);

  const {
    budgetSubjects: budgetDbSubjects,
    useDbBudget,
    hasSupabaseEnv: hasBudgetSupabaseEnv,
    loading: budgetDataLoading,
    budgetSource,
    queryError,
    rowCount,
    refresh: refreshBudgetData
  } = useBudgetDataForScope(reportPeriod, {
    scopeResolution: budgetScopeResolution,
    mockFallbackScope,
    overrides,
    budgetVersion: budgetFilter.budgetVersion
  });

  const [chartMode, setChartMode] = useState<TrendChartMode>("实际对比预算");
  const [chartMetric, setChartMetric] = useState<TrendChartMetric>("收入");
  const [groupFilter, setGroupFilter] = useState<BudgetGroupFilter>("全部");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [draft, setDraft] = useState<BudgetSubjectValueMap>({});
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const storeSelectValue =
    budgetFilter.storeScope === "all" ? 全部门店值 : (budgetFilter.storeId ?? 全部门店值);

  const storeLabel = budgetScopeResolution.scopeLabel;

  const periodLabel = budgetFilterPeriodLabel(budgetFilter);

  const fullBudget = useMemo(
    () =>
      buildFullBudgetVariance(
        mockFallbackScope,
        reportPeriod,
        overrides,
        actualOverrides,
        budgetLabelSubjects,
        budgetFilter.budgetVersion,
        useDbBudget ? budgetDbSubjects : undefined,
        useDbBudget,
        BUDGET_MANAGEMENT_CATALOG
      ),
    [
      mockFallbackScope,
      reportPeriod,
      overrides,
      actualOverrides,
      budgetLabelSubjects,
      budgetFilter.budgetVersion,
      useDbBudget,
      budgetDbSubjects
    ]
  );

  const summary = useMemo(
    () => getBudgetManagementSummary(reportPeriod, overrides, actualOverrides),
    [reportPeriod, overrides, actualOverrides]
  );

  const quarterly = useMemo(
    () => getQuarterlyBudgetSummary(budgetFilter.year, overrides, actualOverrides),
    [budgetFilter.year, overrides, actualOverrides]
  );
  const annual = useMemo(
    () => getAnnualCompletion(budgetFilter.year, overrides, actualOverrides),
    [budgetFilter.year, overrides, actualOverrides]
  );
  const rank = useMemo(
    () => getStoreBudgetDeviationRank(reportPeriod, overrides, actualOverrides),
    [reportPeriod, overrides, actualOverrides]
  );

  const trendMetric = useMemo((): import("@/lib/budget-variance").BudgetTrendMetric => {
    if (chartMetric === "出租率" || chartMetric === "RevPAR" || chartMetric === "ADR") return chartMetric;
    return chartMetric;
  }, [chartMetric]);

  const trendData = useMemo(
    () =>
      getBudgetTrendSeries(
        mockFallbackScope,
        budgetFilter.year,
        overrides,
        actualOverrides,
        trendMetric,
        undefined,
        budgetFilter.budgetVersion
      ),
    [mockFallbackScope, budgetFilter.year, overrides, actualOverrides, trendMetric, budgetFilter.budgetVersion]
  );

  const qualityIssues = useMemo(
    () =>
      checkTrendQuality(
        trendData as Array<Record<string, unknown>>,
        chartMetric === "收入" ? "收入" : chartMetric === "成本" ? "成本" : "利润"
      ),
    [trendData, chartMetric]
  );

  useEffect(() => {
    const fromRows = Object.fromEntries(
      stripHiddenLegacyBudgetLabels(fullBudget.rows).map((r) => [r.label, r.budget])
    );
    const next = filterDraftToManagementCatalog({
      ...fromRows,
      ...(useDbBudget ? budgetDbSubjects : {})
    });
    setDraft(next);
  }, [mockFallbackScope, budgetFilter, overrides, fullBudget.rows, useDbBudget, budgetDbSubjects]);

  const filteredRows = useMemo(() => {
    return stripHiddenLegacyBudgetLabels(fullBudget.rows).filter((row) => {
      const def = BUDGET_MANAGEMENT_CATALOG.find((s) => s.label === row.label);
      if (!def || !subjectMatchesGroupFilter(def, groupFilter)) return false;
      if (onlyAbnormal && !isRowAbnormal(row)) return false;
      return true;
    });
  }, [fullBudget.rows, groupFilter, onlyAbnormal]);

  const rowsByGroup = useMemo(() => {
    const map = new Map<BudgetSubjectGroup, BudgetVarianceRow[]>();
    for (const row of filteredRows) {
      const list = map.get(row.group) ?? [];
      list.push(row);
      map.set(row.group, list);
    }
    return map;
  }, [filteredRows]);

  const canEditSingleStore = isBudgetSingleStoreFilter(budgetFilter);

  /** 预算管理页保存：仅 budget_data + localStorage fallback，禁止写 actual_data（见 docs/data-caliber-freeze.md） */
  const handleSaveBudget = useCallback(async () => {
    const normalizedDraft = normalizeBudgetSubjectDraft(draft);
    setBudgetOverride(mockFallbackScope, reportPeriod, normalizedDraft, budgetFilter.budgetVersion);
    if (!hasBudgetSupabaseEnv) {
      setSaveStatus(budgetSaveStatusNoDatabase());
      return;
    }
    if (!canEditSingleStore || !budgetFilter.storeId) {
      setSaveStatus(budgetSaveStatusAggregateScope());
      return;
    }
    const res = await saveBudgetDraftToSupabase(
      budgetFilter.storeId,
      reportPeriod,
      budgetFilter.budgetVersion,
      normalizedDraft
    );
    if (res.ok) {
      setSaveStatus(budgetSaveStatusSavedToDatabase());
      refreshBudgetData();
    } else {
      setSaveStatus(budgetSaveStatusDatabaseWriteFailed(res.error ?? "未知错误"));
    }
  }, [
    mockFallbackScope,
    reportPeriod,
    draft,
    budgetFilter.budgetVersion,
    budgetFilter.storeId,
    hasBudgetSupabaseEnv,
    canEditSingleStore,
    setBudgetOverride,
    refreshBudgetData
  ]);

  const handleBudgetImport = useCallback(
    async (entries: BudgetOverrideMap) => {
      mergeBudgetOverrides(entries);
      if (hasSupabaseBudgetEnv()) {
        const sync = await syncBudgetOverridesToSupabase(entries, supabaseStores);
        setSaveStatus(
          sync.failCount === 0
            ? budgetImportStatusSynced(sync.successCount)
            : budgetImportStatusPartialSync(sync.successCount, sync.failCount)
        );
        refreshBudgetData();
      } else {
        setSaveStatus(budgetImportStatusLocalOnly());
      }
    },
    [mergeBudgetOverrides, supabaseStores, refreshBudgetData]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">预算管理</h1>
          <p className="text-sm text-muted-foreground">
            酒店 + 餐饮集团完整预算体系 · 与 Excel 导入科目一致
          </p>
        </div>
        <Link href="/financial-reports" className="text-sm text-primary underline-offset-4 hover:underline">
          返回财务报表
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">筛选与账期</CardTitle>
            <p className="text-sm text-muted-foreground">
              本页唯一筛选源；经营门店池：{ACTIVE_STORE_SCOPE_DETAIL_LABEL}
            </p>
          </div>
          <div className="space-y-0.5 text-sm">
            <p>
              <span className="text-muted-foreground">当前期间：</span>
              <span className="font-medium">{periodLabel}</span>
            </p>
            <p>
              <span className="text-muted-foreground">当前门店：</span>
              <span className="font-medium">{storeLabel}</span>
            </p>
            <p>
              <span className="text-muted-foreground">预算版本：</span>
              <span className="font-medium">{getBudgetVersionLabel(budgetFilter.budgetVersion)}</span>
            </p>
            <p className="text-xs text-muted-foreground">{DATA_CALIBER_RULES.budgetManagementTarget}</p>
            <p className="text-xs text-muted-foreground">{BUDGET_DATA_CALIBER_USER_HINT}</p>
            <p className="text-xs text-muted-foreground">
              总营业收入 / 总营业成本 / 经营利润 = 老板核心财务口径
            </p>
            <p className="text-xs text-muted-foreground">
              可售房间数 / 已售房间数 / 客房收入 / ADR / RevPAR = 酒店运营口径
            </p>
            <p className="text-xs text-muted-foreground">
              预算查询模式：
              {budgetScopeResolution.mode === "single"
                ? "单店"
                : budgetScopeResolution.mode === "aggregate"
                  ? "多店聚合"
                  : "无效"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">门店</span>
            <Select
              value={storeSelectValue}
              disabled={storesLoading && supabaseStores.length === 0}
              onValueChange={(v) => {
                if (v === 全部门店值) {
                  patchBudgetFilter({ storeScope: "all", storeId: null });
                } else {
                  patchBudgetFilter({ storeScope: "single", storeId: v });
                }
              }}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder={storesLoading ? "加载门店…" : "选择门店"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={全部门店值}>全部门店</SelectItem>
                {supabaseStores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {formatStoreOptionLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">期间</span>
            <div className="flex gap-1">
              {PERIOD_TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={budgetFilter.periodType === opt.value ? "default" : "outline"}
                  onClick={() => {
                    const month = budgetFilter.month ?? 4;
                    if (opt.value === "month") {
                      patchBudgetFilter({
                        periodType: "month",
                        month,
                        quarter: quarterFromMonth(month)
                      });
                    } else if (opt.value === "quarter") {
                      const q = budgetFilter.quarter ?? quarterFromMonth(month);
                      patchBudgetFilter({ periodType: "quarter", quarter: q });
                    } else {
                      patchBudgetFilter({ periodType: "year" });
                    }
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {budgetFilter.periodType === "month" && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">月份</span>
              <Select
                value={String(budgetFilter.month ?? 1)}
                onValueChange={(v) => {
                  const m = Number(v);
                  patchBudgetFilter({ month: m, quarter: quarterFromMonth(m) });
                }}
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
          )}

          {budgetFilter.periodType === "quarter" && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">季度</span>
              <Select
                value={budgetFilter.quarter ?? "Q2"}
                onValueChange={(v) => patchBudgetFilter({ quarter: v as BudgetQuarter })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTER_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {budgetFilter.year} 年 {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">年份</span>
            <Select
              value={String(budgetFilter.year)}
              onValueChange={(v) => patchBudgetFilter({ year: Number(v) })}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">预算版本</span>
            <Select
              value={budgetFilter.budgetVersion}
              onValueChange={(v) =>
                patchBudgetFilter({ budgetVersion: v as BudgetVersionValue })
              }
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
        <CardContent className="border-t pt-4 space-y-2">
          <DataSourceBanner
            actual={{
              hasSupabaseEnv,
              loading: actualDataLoading,
              useDbActual: hasSupabaseEnv && hasDbRows,
              reportPeriod,
              scopeDescription: storeLabel
            }}
            budget={{
              hasSupabaseEnv: hasBudgetSupabaseEnv,
              loading: budgetDataLoading,
              scopeMode: budgetScopeResolution.mode,
              useDbBudget,
              budgetSource,
              singleStoreId: budgetScopeResolution.singleStoreId,
              queryError,
              rowCount,
              invalidReason: budgetScopeResolution.invalidReason,
              reportPeriod,
              scopeDescription: storeLabel
            }}
          />
          {saveStatus ? <p className="text-xs text-emerald-800">{saveStatus}</p> : null}
        </CardContent>
        <CardContent className="border-t pt-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">预算版本说明</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {BUDGET_VERSION_OPTIONS.map((o) => (
              <li key={o.value}>
                {o.label}（{o.value}）：{o.description}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          标题="本月收入完成率"
          数值={formatPct(summary.收入完成率)}
          变化={summary.收入完成率 >= 1 ? "达标" : "未达标"}
          趋势={summary.收入完成率 >= 1 ? "up" : "down"}
        />
        <MetricCard
          标题="本月利润完成率"
          数值={formatPct(summary.利润完成率)}
          变化="预算对比"
          趋势="neutral"
        />
        <MetricCard
          标题="成本超支门店数"
          数值={`${summary.成本超支门店数} 家`}
          变化="成本+费用实际>预算102%"
          趋势="neutral"
        />
        <MetricCard
          标题="预算偏差最大门店"
          数值={summary.偏差最大门店}
          变化="按利润差异率"
          趋势="neutral"
        />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>月度预算表（{storeLabel}）</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {getBudgetVersionLabel(budgetFilter.budgetVersion)} · 共 {BUDGET_MANAGEMENT_CATALOG.length}{" "}
              个预算科目（老板口径，无重复成本/利润项）
              {hasSupabaseEnv && !actualDataLoading && (hasDbRows || Object.keys(budgetLabelSubjects).length > 0)
                ? " · 已接入经营实际数据"
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v as BudgetGroupFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="科目分组" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_FILTERS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="only-abnormal"
                checked={onlyAbnormal}
                onCheckedChange={(c) => setOnlyAbnormal(c === true)}
              />
              <label htmlFor="only-abnormal" className="cursor-pointer text-sm font-normal">
                只看异常项
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!fullBudget.hasBudgetData ? (
            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center text-sm text-amber-900">
              {storeLabel} · {periodLabel} 尚未导入预算数据，请先下载预算模板并导入。
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              当前筛选条件下无异常科目。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目</TableHead>
                  <TableHead className="text-right">实际</TableHead>
                  <TableHead className="text-right">预算</TableHead>
                  <TableHead className="text-right">差异</TableHead>
                  <TableHead className="text-right">差异率</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedGroups().map((group) => {
                  const rows = rowsByGroup.get(group);
                  if (!rows?.length) return null;
                  return (
                    <Fragment key={group}>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={6} className="py-2 text-sm font-semibold">
                          {group}
                        </TableCell>
                      </TableRow>
                      {rows.map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className={cn("text-right", rowVarianceClass(row))}>
                            {formatBudgetDisplayValue(row.actual, row.unit, catalogKind(row.label))}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatBudgetDisplayValue(row.budget, row.unit, catalogKind(row.label))}
                          </TableCell>
                          <TableCell className={cn("text-right", rowVarianceClass(row))}>
                            {row.variance >= 0 ? "+" : ""}
                            {formatBudgetDisplayValue(row.variance, row.unit, catalogKind(row.label))}
                          </TableCell>
                          <TableCell className={cn("text-right", rowVarianceClass(row))}>
                            {row.varianceRateLabel}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded px-2 py-0.5 text-xs",
                                row.statusTone === "good" && "bg-emerald-100 text-emerald-800",
                                row.statusTone === "bad" && "bg-red-100 text-red-800",
                                row.statusTone === "neutral" && "bg-muted text-muted-foreground"
                              )}
                            >
                              {row.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>预算差异分析</CardTitle>
          <p className="text-sm text-muted-foreground">管理层话术（基于当前门店与账期）</p>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {fullBudget.narratives.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>预算趋势分析</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={chartMode} onValueChange={(v) => setChartMode(v as TrendChartMode)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="实际对比预算">实际 vs 预算</SelectItem>
                <SelectItem value="收入成本利润">收入 / 成本 / 利润</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartMetric} onValueChange={(v) => setChartMetric(v as TrendChartMetric)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="收入">收入</SelectItem>
                <SelectItem value="成本">成本</SelectItem>
                <SelectItem value="利润">利润</SelectItem>
                <SelectItem value="出租率">出租率</SelectItem>
                <SelectItem value="RevPAR">RevPAR</SelectItem>
                <SelectItem value="ADR">ADR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataQualityBanner issues={qualityIssues} />
          <FinancialTrendChart data={trendData} mode={chartMode} metric={chartMetric} />
        </CardContent>
      </Card>

      <div ref={editorRef}>
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>预算手工录入（{storeLabel}）</CardTitle>
              <p className="text-sm text-muted-foreground">
                优先保存至预算数据库；未连接时写入本机预算草稿
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditorExpanded((v) => !v)}>
                {editorExpanded ? "收起科目" : "展开全部科目"}
              </Button>
              <Button type="button" disabled={!canEditSingleStore} onClick={() => void handleSaveBudget()}>
                保存预算
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canEditSingleStore}
                onClick={() =>
                  clearBudgetOverride(mockFallbackScope, reportPeriod, budgetFilter.budgetVersion)
                }
              >
                清除本店本账期
              </Button>
              <Button type="button" variant="outline" onClick={clearAllBudgetOverrides}>
                清除全部本地预算
              </Button>
            </div>
          </CardHeader>
          {editorExpanded && canEditSingleStore ? (
            <CardContent className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>科目</TableHead>
                    <TableHead>预算值</TableHead>
                    <TableHead>单位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BUDGET_MANAGEMENT_CATALOG.map((s) => (
                    <TableRow key={s.label}>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          className="w-[120px]"
                          value={String(draft[s.label] ?? "")}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setDraft((prev) => ({
                              ...prev,
                              [s.label]: Number.isFinite(v) ? v : 0
                            }));
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          ) : (
            <CardContent className="text-sm text-muted-foreground">
              {!canEditSingleStore
                ? "请选择具体门店后再展开录入全部科目，或使用 Excel 批量导入。"
                : "点击「展开全部科目」可逐科目录入；推荐使用 Excel 模板批量导入。"}
            </CardContent>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>季度预算汇总（{budgetFilter.year} 年 · 全部门店）</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>季度</TableHead>
                <TableHead>实际收入</TableHead>
                <TableHead>预算收入</TableHead>
                <TableHead>实际利润</TableHead>
                <TableHead>预算利润</TableHead>
                <TableHead>收入完成率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quarterly.map((row) => (
                <TableRow key={row.季度}>
                  <TableCell>{row.季度}</TableCell>
                  <TableCell>{formatWan(row.实际收入)}</TableCell>
                  <TableCell>{formatWan(row.预算收入)}</TableCell>
                  <TableCell>{formatWan(row.实际利润)}</TableCell>
                  <TableCell>{formatWan(row.预算利润)}</TableCell>
                  <TableCell>{formatPct(row.收入完成率)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>年度预算完成率（{annual.年} · 全部门店）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between rounded-md bg-secondary px-3 py-2">
              <span>收入完成率</span>
              <span className="font-medium">{formatPct(annual.收入完成率)}</span>
            </div>
            <div className="flex justify-between rounded-md bg-secondary px-3 py-2">
              <span>利润完成率</span>
              <span className="font-medium">{formatPct(annual.利润完成率)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-muted-foreground">
              <span>实际收入</span>
              <span>{formatWan(annual.实际收入)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>预算收入</span>
              <span>{formatWan(annual.预算收入)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>门店预算偏差排行（按利润差异率绝对值）</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>门店</TableHead>
                  <TableHead>实际利润</TableHead>
                  <TableHead>预算利润</TableHead>
                  <TableHead>差异率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rank.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.门店}</TableCell>
                    <TableCell>{formatWan(row.实际利润)}</TableCell>
                    <TableCell>{formatWan(row.预算利润)}</TableCell>
                    <TableCell>{formatPct(row.差异率)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div ref={importRef}>
        <BudgetExcelImportPanel
          period={reportPeriod}
          storeId={mockFallbackScope}
          storeDisplayName={storeLabel}
          existingOverrides={overrides}
          onImport={(entries) => void handleBudgetImport(entries)}
        />
      </div>

      <BudgetImportActions
        onManualEntry={() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onExcelImport={() => importRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />
    </div>
  );
}
