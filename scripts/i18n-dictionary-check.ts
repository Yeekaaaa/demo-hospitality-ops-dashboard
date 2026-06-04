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
import type { Locale, MessageTree } from "../lib/i18n/types";
import { getDefaultLocaleFromEnv, resolvePersistedLocale } from "../lib/i18n/types";
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

function collectEmptyLeafKeys(tree: MessageTree, prefix = ""): string[] {
  const empty: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      if (value.trim().length === 0) empty.push(path);
    } else {
      empty.push(...collectEmptyLeafKeys(value, path));
    }
  }
  return empty;
}

const LOGIN_MESSAGE_KEYS = [
  "auth.login.title",
  "auth.login.subtitle",
  "auth.login.accountLabel",
  "auth.login.accountPlaceholder",
  "auth.login.passwordLabel",
  "auth.login.passwordPlaceholder",
  "auth.login.remember",
  "auth.login.rememberMe",
  "auth.login.forgotPassword",
  "auth.login.submit",
  "auth.login.badge",
  "auth.login.companyName",
  "auth.login.productName",
  "auth.login.description",
  "auth.login.tagline"
] as const;

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

/** 允许字典源文件留空（运行时 getMessage 会回退 zh-CN 或 key） */
const ALLOW_EMPTY_DICTIONARY_LEAVES = new Set(["banner.budget.hidden"]);

const zhEmptyLeaves = collectEmptyLeafKeys(zhCNMessages).filter(
  (k) => !ALLOW_EMPTY_DICTIONARY_LEAVES.has(k)
);
const enEmptyLeaves = collectEmptyLeafKeys(enUSMessages).filter(
  (k) => !ALLOW_EMPTY_DICTIONARY_LEAVES.has(k)
);
assert(
  "zh-CN dictionary leaves non-empty",
  zhEmptyLeaves.length === 0,
  zhEmptyLeaves.join(", ")
);
assert(
  "en-US dictionary leaves non-empty",
  enEmptyLeaves.length === 0,
  enEmptyLeaves.join(", ")
);

assert(
  "en-US empty leaf falls back (not blank)",
  getMessage("en-US", "banner.budget.hidden").trim().length > 0
);

for (const key of LOGIN_MESSAGE_KEYS) {
  const en = getMessage("en-US", key);
  const zh = getMessage("zh-CN", key);
  assert(`en-US login key non-empty: ${key}`, en.trim().length > 0 && en !== key, en);
  assert(`zh-CN login key non-empty: ${key}`, zh.trim().length > 0 && zh !== key, zh);
}

assert(
  'getMessage("en-US", "auth.login.title") is English',
  getMessage("en-US", "auth.login.title") === "Sign in"
);
assert(
  "en-US auth.login.title does not equal zh-CN when en key exists",
  getMessage("en-US", "auth.login.title") !== getMessage("zh-CN", "auth.login.title")
);

const prevDefaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
process.env.NEXT_PUBLIC_DEFAULT_LOCALE = "en-US";
assert(
  "getDefaultLocaleFromEnv respects NEXT_PUBLIC_DEFAULT_LOCALE=en-US",
  getDefaultLocaleFromEnv() === "en-US"
);
process.env.NEXT_PUBLIC_DEFAULT_LOCALE = "zh-CN";
assert(
  "getDefaultLocaleFromEnv respects NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN",
  getDefaultLocaleFromEnv() === "zh-CN"
);
if (prevDefaultLocale === undefined) {
  delete process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
} else {
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE = prevDefaultLocale;
}
assert(
  'getMessage("zh-CN", "auth.login.title") is Chinese',
  getMessage("zh-CN", "auth.login.title") === "欢迎登录"
);

assert(
  'getMessage("en-US", "dashboard.pageTitle") is English',
  getMessage("en-US", "dashboard.pageTitle") === "Executive Dashboard"
);
assert(
  'getMessage("zh-CN", "dashboard.pageTitle") is Chinese',
  getMessage("zh-CN", "dashboard.pageTitle") === "经营驾驶舱"
);
assert(
  "en-US dashboard login metrics non-empty",
  getMessage("en-US", "dashboard.metrics.actualRevenue").trim().length > 0 &&
    getMessage("en-US", "dashboard.vsBudgetTitle") === "Actual vs Budget"
);

const missingEn = getMessage("en-US", "auth.login.__missing_key__");
assert(
  "en-US missing key fallback not blank",
  missingEn.trim().length > 0,
  `got "${missingEn}"`
);
assert(
  "en-US missing key falls back to zh or key path",
  missingEn === "auth.login.__missing_key__" || missingEn === getMessage("zh-CN", "auth.login.__missing_key__")
);

const isLocale = (value: string): value is Locale => value === "zh-CN" || value === "en-US";

assert(
  "stale zh-CN localStorage ignored when env default en-US",
  resolvePersistedLocale({
    envDefault: "en-US",
    storedLocale: "zh-CN",
    storedSnapshot: null,
    isValidLocale: isLocale
  }) === "en-US"
);

assert(
  "manual zh-CN kept when snapshot matches env en-US",
  resolvePersistedLocale({
    envDefault: "en-US",
    storedLocale: "zh-CN",
    storedSnapshot: "en-US",
    isValidLocale: isLocale
  }) === "zh-CN"
);

assert(
  "env switch to zh-CN resets stale en-US without matching snapshot",
  resolvePersistedLocale({
    envDefault: "zh-CN",
    storedLocale: "en-US",
    storedSnapshot: "en-US",
    isValidLocale: isLocale
  }) === "zh-CN"
);

assert(
  "zh-CN business keeps manual en-US when snapshot matches",
  resolvePersistedLocale({
    envDefault: "zh-CN",
    storedLocale: "en-US",
    storedSnapshot: "zh-CN",
    isValidLocale: isLocale
  }) === "en-US"
);

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
