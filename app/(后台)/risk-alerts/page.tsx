"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStorePeriod } from "@/contexts/store-period-context";
import { getPreviousReportPeriod } from "@/lib/dashboard-metrics";
import { buildRiskAlerts, type RiskAlertTableRow, type RiskSeverity } from "@/lib/risk-alerts-engine";
import {
  writeIssueDraftFromAlert,
  type IssueDraftFromAlert
} from "@/lib/issue-tracking-storage";
import { cn } from "@/lib/utils";
import {
  getActualDataRowsForPeriodWithStores,
  type ActualDataRowWithStore
} from "@/src/lib/dashboard-data-service";

function severityBadgeClass(s: RiskSeverity): string {
  if (s === "红灯") return "bg-red-100 text-red-900 border-red-200";
  if (s === "黄灯") return "bg-amber-100 text-amber-950 border-amber-200";
  return "bg-emerald-100 text-emerald-900 border-emerald-200";
}

export default function RiskAlertsPage() {
  const router = useRouter();
  const { storeId, reportPeriod, periodLabel } = useStorePeriod();
  const prevReportPeriod = useMemo(() => getPreviousReportPeriod(reportPeriod), [reportPeriod]);

  const [cur, setCur] = useState<ActualDataRowWithStore[]>([]);
  const [prev, setPrev] = useState<ActualDataRowWithStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getActualDataRowsForPeriodWithStores(reportPeriod, storeId),
      getActualDataRowsForPeriodWithStores(prevReportPeriod, storeId)
    ]).then(([c, p]) => {
      if (!cancelled) {
        setCur(c);
        setPrev(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reportPeriod, prevReportPeriod, storeId]);

  const alerts = useMemo(
    () =>
      buildRiskAlerts({
        currentRows: cur as Record<string, unknown>[],
        previousRows: prev as Record<string, unknown>[]
      }),
    [cur, prev]
  );

  const stats = useMemo(() => {
    const red = alerts.filter((a) => a.预警等级 === "红灯").length;
    const yellow = alerts.filter((a) => a.预警等级 === "黄灯").length;
    const meet = alerts.filter((a) => a.是否需要专题会 === "是").length;
    const stores = new Set(alerts.map((a) => a.门店));
    return { red, yellow, meet, storeCount: stores.size };
  }, [alerts]);

  const pushIssue = (row: RiskAlertTableRow) => {
    const draft: IssueDraftFromAlert = {
      description: `【${row.预警项目}】${row.门店}：${row.当前值}`,
      metric: row.预警项目,
      cause: row.原因初判,
      owner: row.建议责任人
    };
    writeIssueDraftFromAlert(draft);
    router.push("/issue-tracking");
  };

  const emptyData = !loading && cur.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">异常预警中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          基于当前账期 <span className="font-medium text-foreground">{periodLabel}</span>{" "}
          的经营实际数据与上期对比自动生成（门店范围与顶部导航一致）。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">红灯</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-700 tabular-nums">{stats.red}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">黄灯</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-700 tabular-nums">{stats.yellow}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">需专题会</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{stats.meet}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">涉及门店数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{stats.storeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">预警清单</CardTitle>
          <p className="text-sm text-muted-foreground">
            仅列出黄灯 / 红灯项。可在行尾生成问题闭环记录（跳转至「问题闭环追踪」）。
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : emptyData ? (
            <p className="text-sm text-muted-foreground">
              暂无预警数据（当前账期无经营数据或未配置经营数据连接）。
            </p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无预警数据（未触发规则阈值）。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>预警项目</TableHead>
                  <TableHead>门店</TableHead>
                  <TableHead>当前值</TableHead>
                  <TableHead>预警标准</TableHead>
                  <TableHead>预警等级</TableHead>
                  <TableHead>原因初判</TableHead>
                  <TableHead>专题会</TableHead>
                  <TableHead>建议责任人</TableHead>
                  <TableHead>处理进度</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap font-medium">{row.预警项目}</TableCell>
                    <TableCell>{row.门店}</TableCell>
                    <TableCell className="max-w-[220px] text-sm">{row.当前值}</TableCell>
                    <TableCell className="max-w-[200px] text-xs text-muted-foreground">{row.预警标准}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                          severityBadgeClass(row.预警等级)
                        )}
                      >
                        {row.预警等级}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[240px] text-sm">{row.原因初判}</TableCell>
                    <TableCell className="text-sm">{row.是否需要专题会}</TableCell>
                    <TableCell className="text-sm">{row.建议责任人}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.处理进度}</TableCell>
                    <TableCell>
                      <Button type="button" variant="outline" size="sm" className="whitespace-nowrap" onClick={() => pushIssue(row)}>
                        生成问题
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        说明：ADR 预算对比字段未在库中配置时，仅按环比降幅判断黄灯。规则随{" "}
        <Link href="/operating-data-template" className="underline">
          经营数据导入
        </Link>{" "}
        增强字段逐步完整而变得更准确。
      </p>
    </div>
  );
}
