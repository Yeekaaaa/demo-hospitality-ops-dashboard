"use client";

import { FileSpreadsheet, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** 手动录入可用；Excel 入口先占位 */
export function BudgetImportActions({
  onManualEntry,
  onExcelImport
}: {
  onManualEntry?: () => void;
  onExcelImport?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">预算数据维护（预留）</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onManualEntry}>
          <PencilLine className="mr-2 h-4 w-4" />
          手动录入预算
        </Button>
        <Button type="button" variant="outline" onClick={onExcelImport}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel 导入预算
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          手动录入与 Excel 导入均写入本机预算草稿；连接预算数据库后将同步至云端。
        </p>
      </CardContent>
    </Card>
  );
}
