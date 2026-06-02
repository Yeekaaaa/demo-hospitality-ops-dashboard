/**
 * 将 budget_overrides 条目或 Excel 解析结果同步写入 budget_data
 *
 * 【防误用】预算管理 / 预算导入只允许写 budget_data，不得写 actual_data。
 * 口径冻结：docs/data-caliber-freeze.md
 */

import { toDbPeriod } from "@/lib/data-caliber";
import { buildBudgetStorageKey, type BudgetOverrideMap, type BudgetSubjectValueMap } from "@/lib/budget-overrides";
import { normalizeBudgetVersion, type BudgetVersionValue } from "@/lib/budget-versions";
import type { ReportPeriod } from "@/lib/mock-analytics";
import { 全部门店值 } from "@/lib/store-master";
import { resolveStoreIdByName } from "@/src/lib/operating-data-import-supabase";
import type { StoreListItem } from "@/src/lib/supabase";
import { budgetSubjectMapToUpsertPayload, normalizeBudgetSubjectDraft } from "@/lib/budget-canonical";
import { upsertBudgetData, type BudgetDataUpsertPayload } from "@/src/lib/budget-data-service";

function parseStorageKey(key: string): {
  scope: string;
  period: ReportPeriod;
  version: BudgetVersionValue;
} | null {
  const parts = key.split("|");
  if (parts.length < 5) return null;
  const [scope, gran, yearStr, suffix, versionRaw] = parts;
  const year = Number(yearStr);
  if (!Number.isFinite(year)) return null;
  let period: ReportPeriod;
  if (gran === "month") {
    const m = Number(String(suffix).replace(/^m/, ""));
    period = { 粒度: "month", 年: year, 月: m };
  } else if (gran === "quarter") {
    const q = Number(String(suffix).replace(/^q/, "")) as 1 | 2 | 3 | 4;
    period = { 粒度: "quarter", 年: year, 季: q };
  } else {
    period = { 粒度: "year", 年: year };
  }
  return { scope, period, version: normalizeBudgetVersion(versionRaw) };
}

/** 把 localStorage 预算 map 中可解析的单店条目写入 Supabase */
export async function syncBudgetOverridesToSupabase(
  entries: BudgetOverrideMap,
  stores: readonly StoreListItem[]
): Promise<{ successCount: number; failCount: number; errors: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const [key, subjects] of Object.entries(entries)) {
    const parsed = parseStorageKey(key);
    if (!parsed || parsed.scope === 全部门店值) continue;

    const resolved = resolveStoreIdByName(parsed.scope, [...stores]);
    let storeId: string | null = "id" in resolved ? resolved.id : null;
    if (!storeId) {
      const byUuid = stores.find((s) => s.id === parsed.scope);
      if (byUuid) storeId = byUuid.id;
    }
    if (!storeId) {
      failCount += 1;
      errors.push(`${key}: ${"error" in resolved ? resolved.error : "无法解析门店"}`);
      continue;
    }
    const { period_type, period_value } = toDbPeriod(parsed.period);
    const core = budgetSubjectMapToUpsertPayload(
      normalizeBudgetSubjectDraft(subjects as BudgetSubjectValueMap)
    );

    const payload: BudgetDataUpsertPayload = {
      store_id: storeId,
      period_type,
      period_value,
      budget_version: parsed.version,
      ...core
    };

    const res = await upsertBudgetData(payload);
    if (res.ok) successCount += 1;
    else {
      failCount += 1;
      errors.push(`${key}: ${res.error}`);
    }
  }

  return { successCount, failCount, errors };
}

/**
 * 单店保存：草稿科目 → budget_data（禁止写入 actual_data）
 * @see docs/data-caliber-freeze.md
 */
export async function saveBudgetDraftToSupabase(
  storeId: string,
  reportPeriod: ReportPeriod,
  budgetVersion: BudgetVersionValue,
  draft: BudgetSubjectValueMap
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { period_type, period_value } = toDbPeriod(reportPeriod);
  const core = budgetSubjectMapToUpsertPayload(normalizeBudgetSubjectDraft(draft));
  return upsertBudgetData({
    store_id: storeId,
    period_type,
    period_value,
    budget_version: budgetVersion,
    ...core
  });
}

/** 校验 storage key 是否含版本（供导入后批量同步） */
export { buildBudgetStorageKey };
