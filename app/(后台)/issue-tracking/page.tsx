"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  clearIssueDraftFromAlert,
  createIssueId,
  loadIssues,
  readIssueDraftFromAlert,
  saveIssues,
  type IssueRecord,
  type IssueStatus
} from "@/lib/issue-tracking-storage";
import { cn } from "@/lib/utils";

const STATUSES: IssueStatus[] = ["待处理", "进行中", "已完成", "已延期"];

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function IssueTrackingPage() {
  const [rows, setRows] = useState<IssueRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("全部");
  const [filterOwner, setFilterOwner] = useState<string>("全部");

  const [description, setDescription] = useState("");
  const [discoveredAt, setDiscoveredAt] = useState(todayStr);
  const [metric, setMetric] = useState("");
  const [cause, setCause] = useState("");
  const [actions, setActions] = useState("");
  const [owner, setOwner] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [retrospective, setRetrospective] = useState("");
  const [status, setStatus] = useState<IssueStatus>("待处理");

  const refresh = useCallback(() => {
    setRows(loadIssues());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const draft = readIssueDraftFromAlert();
    if (!draft) return;
    setDescription(draft.description);
    setMetric(draft.metric);
    setCause(draft.cause);
    setOwner(draft.owner);
    setDiscoveredAt(todayStr());
    clearIssueDraftFromAlert();
  }, []);

  const owners = useMemo(() => {
    const s = new Set(rows.map((r) => r.owner.trim()).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterStatus !== "全部" && r.status !== filterStatus) return false;
      if (filterOwner !== "全部" && r.owner !== filterOwner) return false;
      return true;
    });
  }, [rows, filterStatus, filterOwner]);

  const addIssue = () => {
    if (!description.trim()) return;
    const next: IssueRecord = {
      id: createIssueId(),
      description: description.trim(),
      discoveredAt: discoveredAt.trim() || todayStr(),
      metric: metric.trim(),
      cause: cause.trim(),
      actions: actions.trim(),
      owner: owner.trim(),
      plannedAt: plannedAt.trim(),
      completedAt: completedAt.trim(),
      retrospective: retrospective.trim(),
      status
    };
    const list = [next, ...rows];
    saveIssues(list);
    setRows(list);
    setDescription("");
    setMetric("");
    setCause("");
    setActions("");
    setOwner("");
    setPlannedAt("");
    setCompletedAt("");
    setRetrospective("");
    setStatus("待处理");
    setDiscoveredAt(todayStr());
  };

  const updateStatus = (id: string, s: IssueStatus) => {
    const list = rows.map((r) => (r.id === id ? { ...r, status: s } : r));
    saveIssues(list);
    setRows(list);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">问题闭环追踪</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          数据保存在本机浏览器 <code className="rounded bg-muted px-1 text-xs">localStorage</code>（
          <code className="rounded bg-muted px-1 text-xs">fengtin_issue_tracking_v1</code>
          ），未写入 Supabase。可从「异常预警中心」带入草稿。
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">新增问题</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="iss-desc" className="text-sm font-medium text-slate-800">
              问题描述
            </label>
            <textarea
              id="iss-desc"
              className={cn(
                "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述问题现象"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="iss-date" className="text-sm font-medium text-slate-800">
              发现日期
            </label>
            <Input id="iss-date" type="date" value={discoveredAt} onChange={(e) => setDiscoveredAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="iss-metric" className="text-sm font-medium text-slate-800">
              涉及指标
            </label>
            <Input id="iss-metric" value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="如：GOP 率、OTA 占比" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="iss-cause" className="text-sm font-medium text-slate-800">
              原因判断
            </label>
            <textarea
              id="iss-cause"
              className={cn(
                "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
              value={cause}
              onChange={(e) => setCause(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="iss-act" className="text-sm font-medium text-slate-800">
              处理措施
            </label>
            <textarea
              id="iss-act"
              className={cn(
                "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
              value={actions}
              onChange={(e) => setActions(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="iss-owner" className="text-sm font-medium text-slate-800">
              责任人
            </label>
            <Input id="iss-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">状态</span>
            <Select value={status} onValueChange={(v) => setStatus(v as IssueStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="iss-plan" className="text-sm font-medium text-slate-800">
              计划完成时间
            </label>
            <Input id="iss-plan" type="date" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="iss-done" className="text-sm font-medium text-slate-800">
              实际完成时间
            </label>
            <Input id="iss-done" type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="iss-ret" className="text-sm font-medium text-slate-800">
              复盘结果
            </label>
            <textarea
              id="iss-ret"
              className={cn(
                "flex min-h-[52px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
              value={retrospective}
              onChange={(e) => setRetrospective(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="button" onClick={addIssue}>
              保存问题
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">筛选</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">状态</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">责任人</span>
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">问题列表</CardTitle>
          <p className="text-sm text-muted-foreground">共 {filtered.length} 条（总 {rows.length} 条）</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无记录。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>问题描述</TableHead>
                  <TableHead>发现日期</TableHead>
                  <TableHead>涉及指标</TableHead>
                  <TableHead>责任人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>计划完成</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[280px] text-sm font-medium">{r.description}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.discoveredAt}</TableCell>
                    <TableCell className="text-sm">{r.metric || "—"}</TableCell>
                    <TableCell className="text-sm">{r.owner || "—"}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as IssueStatus)}>
                        <SelectTrigger className="h-8 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">{r.plannedAt || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
