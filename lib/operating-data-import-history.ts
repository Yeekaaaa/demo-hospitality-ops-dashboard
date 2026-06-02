/**
 * 经营数据导入历史（浏览器 localStorage，最近 10 条）
 */

export const OPERATING_IMPORT_HISTORY_STORAGE_KEY = "ft-operating-data-import-history";
export const OPERATING_IMPORT_HISTORY_MAX = 10;

export type OperatingImportHistoryEntry = {
  id: string;
  /** ISO 8601 */
  importedAt: string;
  fileName: string;
  successCount: number;
  failCount: number;
  operator: string;
};

function isEntry(x: unknown): x is OperatingImportHistoryEntry {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.importedAt === "string" &&
    typeof o.fileName === "string" &&
    typeof o.successCount === "number" &&
    typeof o.failCount === "number" &&
    typeof o.operator === "string"
  );
}

export function loadOperatingImportHistory(): OperatingImportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OPERATING_IMPORT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, OPERATING_IMPORT_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function appendOperatingImportHistory(input: {
  fileName: string;
  successCount: number;
  failCount: number;
  operator: string;
}): void {
  if (typeof window === "undefined") return;

  const entry: OperatingImportHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    importedAt: new Date().toISOString(),
    fileName: input.fileName.trim() || "未知文件",
    successCount: input.successCount,
    failCount: input.failCount,
    operator: input.operator.trim() || "未登记"
  };

  const merged = [entry, ...loadOperatingImportHistory()].slice(0, OPERATING_IMPORT_HISTORY_MAX);
  window.localStorage.setItem(OPERATING_IMPORT_HISTORY_STORAGE_KEY, JSON.stringify(merged));
}
