/**
 * i18n 字典脚手架验收
 * npx --yes tsx scripts/i18n-dictionary-check.ts
 */
import {
  buildActualBannerDisplay,
  resolveActualBannerTone
} from "../lib/actual-data-source";
import {
  buildBudgetBannerDisplay,
  resolveBudgetBannerTone,
  type BudgetDataHintState
} from "../lib/budget-data-source";
import { getMessage, t } from "../lib/i18n/get-message";
import { enUSMessages } from "../lib/i18n/messages/en-US";
import { zhCNMessages } from "../lib/i18n/messages/zh-CN";
import type { MessageTree } from "../lib/i18n/types";
import {
  formatMetricSourceLabel,
  METRIC_SOURCE_TAG
} from "../lib/metric-source-labels";
import { chartTypeLabelZh, reasonLabelZh } from "../lib/smart-chart/display-labels";

const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    failures.push(detail ? `${name}: ${detail}` : name);
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function collectLeafKeys(tree: MessageTree, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      keys.push(path);
    } else {
      keys.push(...collectLeafKeys(value, path));
    }
  }
  return keys;
}

const zhKeys = collectLeafKeys(zhCNMessages);
const enKeys = new Set(collectLeafKeys(enUSMessages));

assert("zh-CN has nav.dashboard", zhKeys.includes("nav.items.dashboard"));
assert("zh-CN has smartChart.chartType.line", zhKeys.includes("smartChart.chartType.line"));
assert("zh-CN key count >= 80", zhKeys.length >= 80, `count=${zhKeys.length}`);

for (const key of [
  "nav.items.dashboard",
  "nav.groups.finance",
  "auth.login.title",
  "auth.login.submit",
  "auth.login.forgotPassword",
  "smartChart.emptyRecommendation",
  "dataSource.operatingActual"
]) {
  assert(`t(${key})`, t(key).length > 0 && !t(key).includes("nav.items"));
}

assert(
  "interpolation banner.actual.periodScope",
  getMessage("zh-CN", "banner.actual.periodScope", { period: "2026-01", scope: "全部门店" }).includes(
    "2026-01"
  )
);

assert(
  "en-US nav fallback zh",
  getMessage("en-US", "nav.items.dashboard") === "Dashboard"
);

assert(
  "en-US smartChart.reason in English",
  getMessage("en-US", "smartChart.reason.multi_period_trend").includes("line chart")
);

assert("en-US scaffold keys subset", [...enKeys].every((k) => zhKeys.includes(k)));

assert("chartTypeLabelZh line", chartTypeLabelZh("line") === t("smartChart.chartType.line"));
assert(
  "reasonLabelZh multi_period_trend",
  reasonLabelZh("multi_period_trend") === t("smartChart.reason.multi_period_trend")
);

const actualDisplay = buildActualBannerDisplay({
  tone: "real",
  periodLabel: "2026-01",
  scopeDescription: "全部门店"
});
assert(
  "buildActualBannerDisplay real",
  actualDisplay.badge === t("banner.actual.real") &&
    actualDisplay.meta.includes("2026-01") &&
    actualDisplay.hint === t("banner.actual.realHint")
);

assert(
  "resolveActualBannerTone unchanged",
  resolveActualBannerTone({
    hasSupabaseEnv: true,
    loading: false,
    useDbActual: true
  }) === "real"
);

const budgetState: BudgetDataHintState = {
  hasSupabaseEnv: true,
  loading: false,
  scopeMode: "single",
  useDbBudget: true,
  budgetSource: "supabase",
  singleStoreId: "x",
  queryError: null,
  rowCount: 1,
  invalidReason: null
};
const budgetDisplay = buildBudgetBannerDisplay(
  budgetState,
  { 粒度: "month", 年: 2026, 月: 1 },
  "门店 A"
);
assert(
  "buildBudgetBannerDisplay real",
  budgetDisplay?.badge === t("banner.budget.real") &&
    resolveBudgetBannerTone(budgetState) === "real"
);

assert(
  "formatMetricSourceLabel dictionary",
  formatMetricSourceLabel(METRIC_SOURCE_TAG.operatingActual) === t("dataSource.operatingActual")
);

if (failures.length > 0) {
  console.error("\nFAILED:", failures.join("; "));
  process.exit(1);
}

console.log(`\nAll i18n dictionary checks passed (${zhKeys.length} zh-CN keys).`);
