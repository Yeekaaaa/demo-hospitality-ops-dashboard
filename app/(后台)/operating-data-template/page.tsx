"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  downloadOperatingDataImportTemplate,
  OPERATING_DATA_IMPORT_SHEET_NAME
} from "@/lib/operating-data-import-template";
import { OPERATING_DATA_EXTENSION_IMPORT_COLUMNS } from "@/lib/operating-data-asset-field-meta";
import {
  parseOperatingDataWorkbook,
  readOperatingDataWorkbook,
  type OperatingDataPreviewRow
} from "@/lib/operating-data-import-parse";
import { cn } from "@/lib/utils";
import { getStores } from "@/src/lib/supabase";
import {
  importOperatingDataToSupabase,
  type OperatingDataImportSummary
} from "@/src/lib/operating-data-import-supabase";
import {
  appendOperatingImportHistory,
  loadOperatingImportHistory,
  type OperatingImportHistoryEntry
} from "@/lib/operating-data-import-history";

export default function OperatingDataTemplatePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<OperatingDataPreviewRow[] | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<OperatingDataImportSummary | null>(null);
  const [importGlobalError, setImportGlobalError] = useState<string | null>(null);
  const [importOperator, setImportOperator] = useState("");
  const [importHistory, setImportHistory] = useState<OperatingImportHistoryEntry[]>([]);

  useEffect(() => {
    setImportHistory(loadOperatingImportHistory());
  }, []);

  const hasSupabaseEnv = useMemo(
    () =>
      Boolean(
        typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
          typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
      ),
    []
  );

  const allPreviewRowsPass =
    previewRows != null &&
    previewRows.length > 0 &&
    previewRows.every((r) => r.errors.length === 0);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const xlsx = await import("xlsx");
      downloadOperatingDataImportTemplate(xlsx);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setParseError(null);
    setPreviewRows(null);
    setImportSummary(null);
    setImportGlobalError(null);
    setUploadFileName(file.name);

    try {
      const buf = await file.arrayBuffer();
      const xlsx = await import("xlsx");
      const wb = readOperatingDataWorkbook(buf, xlsx);
      const result = parseOperatingDataWorkbook(wb, xlsx);
      if (!result.ok) {
        setParseError(result.error);
        return;
      }
      setPreviewRows(result.rows);
    } catch {
      setParseError("文件无法读取或不是有效的 Excel 文件，请检查后重试。");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!previewRows?.length || !allPreviewRowsPass) return;
    setImportBusy(true);
    setImportSummary(null);
    setImportGlobalError(null);
    try {
      const stores = await getStores();
      if (!stores.length) {
        throw new Error("未从 Supabase 读取到门店列表，请检查 stores 表是否有数据。");
      }
      const summary = await importOperatingDataToSupabase(previewRows, stores);
      setImportSummary(summary);
      appendOperatingImportHistory({
        fileName: uploadFileName ?? "未知文件",
        successCount: summary.successCount,
        failCount: summary.failCount,
        operator: importOperator
      });
      setImportHistory(loadOperatingImportHistory());
    } catch (e) {
      setImportGlobalError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportBusy(false);
    }
  }, [previewRows, allPreviewRowsPass, uploadFileName, importOperator]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">经营数据导入模板</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          生成与经营驾驶舱 <code className="rounded bg-muted px-1 py-0.5 text-xs">actual_data</code>{" "}
          表字段对齐的 Excel 模板，含中文表头、示例行与「字段说明」工作表。支持上传预览、校验与写入 Supabase。
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          建议每月由财务或店长按门店填写本月经营数据。基础字段必填，增强字段可逐步完善。上传确认后<strong>仅写入 actual_data</strong>
          （实际经营结果），不包含任何预算字段；预算请在「预算管理」中单独维护。
        </p>
      </div>

      <Card className="max-w-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">下载模板</CardTitle>
          <p className="text-sm text-muted-foreground">
            表头在原有「门店、账期、收入、成本、利润、房晚、客房收入」基础上，追加酒店资产管理扩展字段（渠道结构、成本拆解、GOP/NOI/现金流、风险与运营质量等）。金额列单位为元；占比为
            0–1 小数或百分数。
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleDownload} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            {loading ? "正在生成…" : "下载 Excel 模板"}
          </Button>
          <p className="text-xs text-muted-foreground">文件名将保存为：经营数据导入模板.xlsx</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">上传经营数据 Excel 并预览</CardTitle>
          <p className="text-sm text-muted-foreground">
            请上传使用上述模板编辑的文件；系统将读取「{OPERATING_DATA_IMPORT_SHEET_NAME}」工作表并校验必填项与格式。全部校验通过后可一键写入
            actual_data（见下方「确认导入」）。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "解析中…" : "选择 Excel 文件"}
            </Button>
          </div>
          {uploadFileName && (
            <p className="text-xs text-muted-foreground">
              已选文件：<span className="font-medium text-foreground">{uploadFileName}</span>
            </p>
          )}
          {parseError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{parseError}</div>
          )}
        </CardContent>
      </Card>

      {previewRows && previewRows.length === 0 && !parseError && (
        <p className="text-sm text-muted-foreground">「数据模板」中无有效数据行（已跳过空行）。</p>
      )}

      {previewRows && previewRows.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">预览与校验</CardTitle>
            <p className="text-sm text-muted-foreground">
              空行已自动跳过。标红行为存在校验问题；「校验结果」列汇总说明。序号表示预览中的顺序，与 Excel
              从上到下的非空数据行一致。
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>门店</TableHead>
                  <TableHead>账期类型</TableHead>
                  <TableHead>账期</TableHead>
                  <TableHead>营业收入</TableHead>
                  <TableHead>总成本</TableHead>
                  <TableHead>利润</TableHead>
                  <TableHead>可售房晚</TableHead>
                  <TableHead>已售房晚</TableHead>
                  <TableHead>客房收入</TableHead>
                  {OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.map((c) => (
                    <TableHead key={c.dbKey} className="min-w-[100px] whitespace-nowrap text-xs">
                      {c.headerZh}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[200px]">校验结果</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r) => {
                  const bad = r.errors.length > 0;
                  return (
                    <TableRow key={r.previewIndex} className={cn(bad && "bg-red-50/90")}>
                      <TableCell className="text-muted-foreground">{r.previewIndex}</TableCell>
                      <TableCell className="font-medium">{r.门店}</TableCell>
                      <TableCell>{r.账期类型}</TableCell>
                      <TableCell>{r.账期}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.营业收入}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.总成本 || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.利润 || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.可售房晚 || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.已售房晚 || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.客房收入 || "—"}</TableCell>
                      {OPERATING_DATA_EXTENSION_IMPORT_COLUMNS.map((c) => {
                        const v = r.assetValues[c.dbKey as keyof typeof r.assetValues];
                        const show =
                          typeof v === "number" && Number.isFinite(v)
                            ? c.kind === "count" || c.kind === "integer"
                              ? String(v)
                              : c.kind === "yuan" || c.kind === "wan"
                                ? v.toLocaleString("zh-CN", { maximumFractionDigits: 2 })
                                : `${(v * 100).toFixed(1)}%`
                            : "—";
                        return (
                          <TableCell key={c.dbKey} className="text-right text-xs tabular-nums">
                            {show}
                          </TableCell>
                        );
                      })}
                      <TableCell className={cn("text-sm", bad ? "text-red-800" : "text-emerald-700")}>
                        {bad ? r.errors.join("；") : "通过"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {previewRows && previewRows.length > 0 && allPreviewRowsPass && (
        <Card className="max-w-3xl border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">确认导入 Supabase</CardTitle>
            <p className="text-sm text-muted-foreground">
              当前预览共 {previewRows.length} 行，均已通过格式校验。导入时将门店名称映射为{" "}
              <code className="rounded bg-white/80 px-1 text-xs">stores.id</code>
              ，并按「门店 + 账期类型 + 账期」对 <code className="rounded bg-white/80 px-1 text-xs">actual_data</code>{" "}
              执行新增或更新。
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasSupabaseEnv && (
              <p className="text-sm text-amber-900">
                未检测到 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY，无法执行导入。配置环境变量后刷新页面。
              </p>
            )}
            <div className="max-w-md space-y-1.5">
              <label htmlFor="import-operator" className="text-sm font-medium text-slate-800">
                操作人（可选）
              </label>
              <Input
                id="import-operator"
                placeholder="用于导入历史记录，如：张三"
                value={importOperator}
                onChange={(e) => setImportOperator(e.target.value)}
                disabled={importBusy}
                maxLength={64}
              />
              <p className="text-xs text-muted-foreground">留空则历史记录中记为「未登记」。历史保存在本浏览器。</p>
            </div>
            <Button
              type="button"
              disabled={!hasSupabaseEnv || importBusy}
              onClick={handleConfirmImport}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {importBusy ? "正在导入…" : "确认导入 Supabase"}
            </Button>
          </CardContent>
        </Card>
      )}

      {importGlobalError && (
        <div className="max-w-3xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {importGlobalError}
        </div>
      )}

      {importSummary && (
        <Card className="max-w-4xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">导入结果</CardTitle>
            <p className="text-sm text-muted-foreground">
              成功 <span className="font-semibold text-emerald-700">{importSummary.successCount}</span> 条，失败{" "}
              <span className="font-semibold text-red-700">{importSummary.failCount}</span> 条。
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>门店</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="min-w-[280px]">说明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importSummary.rowResults.map((r) => (
                  <TableRow key={`${r.previewIndex}-${r.门店}`} className={cn(!r.ok && "bg-red-50/90")}>
                    <TableCell>{r.previewIndex}</TableCell>
                    <TableCell className="font-medium">{r.门店}</TableCell>
                    <TableCell className={cn("text-sm font-medium", r.ok ? "text-emerald-700" : "text-red-800")}>
                      {r.ok ? "成功" : "失败"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{r.message ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 border-dashed bg-slate-50/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">导入历史记录</CardTitle>
          <p className="text-sm text-muted-foreground">
            展示最近 10 次成功执行「确认导入」的记录（时间、文件名、成功/失败行数、操作人）。数据保存在本机浏览器
            localStorage，换设备或清除站点数据后将不可见。
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {importHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无导入历史。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">导入时间</TableHead>
                  <TableHead className="min-w-[200px]">文件名</TableHead>
                  <TableHead className="w-24 text-right">成功行数</TableHead>
                  <TableHead className="w-24 text-right">失败行数</TableHead>
                  <TableHead className="min-w-[100px]">操作人</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-slate-700">
                      {new Date(h.importedAt).toLocaleString("zh-CN", { hour12: false })}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm font-medium" title={h.fileName}>
                      {h.fileName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{h.successCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-700">{h.failCount}</TableCell>
                    <TableCell className="text-sm">{h.operator}</TableCell>
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
