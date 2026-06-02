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
  createInspectionId,
  INSPECTION_MODULES,
  loadInspections,
  saveInspections,
  type InspectionModule,
  type StoreInspectionRecord
} from "@/lib/store-inspection-storage";
import { cn } from "@/lib/utils";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StoreInspectionPage() {
  const [rows, setRows] = useState<StoreInspectionRecord[]>([]);
  const [filterStore, setFilterStore] = useState("全部");
  const [filterAbnormal, setFilterAbnormal] = useState<string>("全部");

  const [storeName, setStoreName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(todayStr);
  const [inspector, setInspector] = useState("");
  const [module, setModule] = useState<InspectionModule>("产品状态");
  const [checklistItem, setChecklistItem] = useState("");
  const [situation, setSituation] = useState("");
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [problem, setProblem] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");

  const refresh = useCallback(() => setRows(loadInspections()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const storeNames = useMemo(() => {
    const s = new Set(rows.map((r) => r.storeName.trim()).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterStore !== "全部" && r.storeName !== filterStore) return false;
      if (filterAbnormal === "是" && !r.isAbnormal) return false;
      if (filterAbnormal === "否" && r.isAbnormal) return false;
      return true;
    });
  }, [rows, filterStore, filterAbnormal]);

  const addRow = () => {
    if (!storeName.trim() || !checklistItem.trim()) return;
    const rec: StoreInspectionRecord = {
      id: createInspectionId(),
      storeName: storeName.trim(),
      inspectionDate: inspectionDate || todayStr(),
      inspector: inspector.trim(),
      module,
      checklistItem: checklistItem.trim(),
      situation: situation.trim(),
      isAbnormal,
      problem: problem.trim(),
      suggestion: suggestion.trim(),
      owner: owner.trim(),
      dueDate: dueDate.trim()
    };
    const list = [rec, ...rows];
    saveInspections(list);
    setRows(list);
    setChecklistItem("");
    setSituation("");
    setProblem("");
    setSuggestion("");
    setOwner("");
    setDueDate("");
    setIsAbnormal(false);
  };

  const exportExcel = async () => {
    const xlsx = await import("xlsx");
    const { utils, writeFile } = xlsx;
    const header = [
      "门店名称",
      "巡店日期",
      "巡店人员",
      "模块",
      "检查项",
      "现状",
      "是否异常",
      "问题描述",
      "整改建议",
      "责任人",
      "完成时间"
    ];
    const data = filtered.map((r) => [
      r.storeName,
      r.inspectionDate,
      r.inspector,
      r.module,
      r.checklistItem,
      r.situation,
      r.isAbnormal ? "是" : "否",
      r.problem,
      r.suggestion,
      r.owner,
      r.dueDate
    ]);
    const ws = utils.aoa_to_sheet([header, ...data]);
    ws["!cols"] = header.map(() => ({ wch: 14 }));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "巡店检查");
    writeFile(wb, `巡店检查表导出_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">巡店检查表</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            本地保存（<code className="rounded bg-muted px-1 text-xs">fengtin_store_inspection_v1</code>
            ），支持导出当前筛选结果为 Excel。
          </p>
        </div>
        <Button type="button" variant="outline" onClick={exportExcel} disabled={filtered.length === 0}>
          导出 Excel
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">新增巡店记录</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">门店名称</span>
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="必填" />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">巡店日期</span>
            <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">巡店人员</span>
            <Input value={inspector} onChange={(e) => setInspector(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">模块</span>
            <Select value={module} onValueChange={(v) => setModule(v as InspectionModule)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSPECTION_MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <span className="block text-sm font-medium text-slate-800">检查项</span>
            <Input value={checklistItem} onChange={(e) => setChecklistItem(e.target.value)} placeholder="必填" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <span className="block text-sm font-medium text-slate-800">现状</span>
            <textarea
              className={cn(
                "flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="abn"
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={isAbnormal}
              onChange={(e) => setIsAbnormal(e.target.checked)}
            />
            <label htmlFor="abn" className="text-sm font-normal text-slate-800">
              是否异常
            </label>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <span className="block text-sm font-medium text-slate-800">问题描述</span>
            <textarea
              className={cn(
                "flex min-h-[52px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <span className="block text-sm font-medium text-slate-800">整改建议</span>
            <textarea
              className={cn(
                "flex min-h-[52px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">责任人</span>
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">完成时间</span>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button type="button" onClick={addRow}>
              保存记录
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
            <span className="block text-sm font-medium text-slate-800">门店</span>
            <Select value={filterStore} onValueChange={setFilterStore}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                {storeNames.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">是否异常</span>
            <Select value={filterAbnormal} onValueChange={setFilterAbnormal}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                <SelectItem value="是">是</SelectItem>
                <SelectItem value="否">否</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">记录列表</CardTitle>
          <p className="text-sm text-muted-foreground">
            当前筛选 {filtered.length} 条（共 {rows.length} 条）
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无记录。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>门店</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>人员</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>检查项</TableHead>
                  <TableHead>异常</TableHead>
                  <TableHead>问题</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.storeName}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.inspectionDate}</TableCell>
                    <TableCell className="text-sm">{r.inspector || "—"}</TableCell>
                    <TableCell className="text-sm">{r.module}</TableCell>
                    <TableCell className="max-w-[200px] text-sm">{r.checklistItem}</TableCell>
                    <TableCell>{r.isAbnormal ? "是" : "否"}</TableCell>
                    <TableCell className="max-w-[220px] text-sm text-muted-foreground">{r.problem || "—"}</TableCell>
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
