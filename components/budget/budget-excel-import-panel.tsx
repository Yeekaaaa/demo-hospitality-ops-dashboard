"use client";

import { useCallback, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBudgetImportWorkbook } from "@/lib/budget-import-template";
import { parseBudgetWorkbook, readBudgetWorkbook } from "@/lib/budget-import-parse";
import type { BudgetOverrideMap } from "@/lib/budget-overrides";
import { getStoreById } from "@/lib/store-master";
import type { ReportPeriod } from "@/lib/mock-analytics";

type Props = {
  period: ReportPeriod;
  storeId: string;
  /** Supabase 门店展示名（UUID 时 getStoreById 无效） */
  storeDisplayName?: string;
  existingOverrides: BudgetOverrideMap;
  onImport: (entries: BudgetOverrideMap) => void;
};

function periodFileSuffix(period: ReportPeriod): string {
  if (period.粒度 === "year") return `${period.年}全年`;
  if (period.粒度 === "quarter") return `${period.年}Q${period.季}`;
  return `${period.年}${period.月}月`;
}

function templateMonthQuarter(period: ReportPeriod): { month: number; quarter: string } {
  if (period.粒度 === "month") {
    const m = period.月 ?? 1;
    const q = Math.ceil(m / 3);
    return { month: m, quarter: `Q${q}` };
  }
  if (period.粒度 === "quarter") {
    const q = period.季 ?? 1;
    return { month: q * 3, quarter: `Q${q}` };
  }
  return { month: 1, quarter: "Q1" };
}

export function BudgetExcelImportPanel({
  period,
  storeId,
  storeDisplayName,
  existingOverrides,
  onImport
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadTemplate = useCallback(async () => {
    const XLSX = await import("xlsx");
    const store = storeId !== "all" ? getStoreById(storeId) : null;
    const storeName =
      storeDisplayName ??
      (store ? `${store.品牌}-${store.门店名称}` : storeId !== "all" ? storeId : "全部门店");
    const { month, quarter } = templateMonthQuarter(period);
    const wb = createBudgetImportWorkbook(XLSX, {
      storeName,
      year: period.年,
      month,
      quarter
    });
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `预算录入模板_${storeName}_${periodFileSuffix(period)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`已下载模板（${storeName} · ${periodFileSuffix(period)} · 含全部标准科目）`);
    setError(null);
  }, [period, storeId, storeDisplayName]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setStatus(null);
      try {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = readBudgetWorkbook(buf, XLSX);
        const parsed = parseBudgetWorkbook(wb, XLSX, existingOverrides);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }
        onImport(parsed.nextEntries);
        const warn =
          parsed.warnings.length > 0
            ? `（${parsed.warnings.length} 条提示：${parsed.warnings[0]!.message}）`
            : "";
        setStatus(`已导入 ${parsed.items.length} 条预算${warn}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "解析失败");
      }
    },
    [existingOverrides, onImport]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" />
          预算 Excel 导入
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          下载长表模板（含全部标准科目与字段说明），填写后上传。表头：门店、年份、月份、季度、科目、预算值、单位、备注。
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void downloadTemplate()}>
            <Download className="mr-1 h-4 w-4" />
            下载预算模板
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />
            上传 Excel
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
        {error ? (
          <pre className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            {error}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
