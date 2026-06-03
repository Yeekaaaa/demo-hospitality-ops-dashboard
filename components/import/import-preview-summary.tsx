"use client";

import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { OperatingDataPreviewRow } from "@/lib/operating-data-import-parse";
import { cn } from "@/lib/utils";

export function countPreviewIssues(rows: OperatingDataPreviewRow[]) {
  let errorRows = 0;
  let warningRows = 0;
  for (const r of rows) {
    if (r.errors.length > 0) errorRows += 1;
    else if (r.warnings.length > 0) warningRows += 1;
  }
  return { errorRows, warningRows, total: rows.length };
}

export function ImportPreviewSummary({ rows }: { rows: OperatingDataPreviewRow[] }) {
  const { errorRows, warningRows } = countPreviewIssues(rows);

  if (errorRows > 0) {
    return (
      <div
        role="status"
        className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">
            有 {errorRows} 行需要修正，修正后才能导入。
          </p>
          {warningRows > 0 ? (
            <p className="mt-1 text-red-800/90">
              另有 {warningRows} 行金额填写提示，请在修正错误后一并核对。
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (warningRows > 0) {
    return (
      <div
        role="status"
        className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <span className="font-medium">有 {warningRows} 行提示，请确认金额是否按元填写；</span>
          提示不会阻止导入。
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="font-medium">检查通过，可以导入。</p>
    </div>
  );
}

export function ImportPreviewLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm border border-red-200 bg-red-50" aria-hidden />
        红色行：须修正的错误
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm border border-amber-200 bg-amber-50" aria-hidden />
        黄色行：金额疑似按万元填写（不阻断）
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm border border-emerald-200 bg-white" aria-hidden />
        无底色：检查通过
      </li>
    </ul>
  );
}
