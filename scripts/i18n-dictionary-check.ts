/**
 * i18n 字典脚手架验收
 * npx --yes tsx scripts/i18n-dictionary-check.ts
 */
import { getMessage, t } from "../lib/i18n/get-message";
import { enUSMessages } from "../lib/i18n/messages/en-US";
import { zhCNMessages } from "../lib/i18n/messages/zh-CN";
import type { MessageTree } from "../lib/i18n/types";

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
  "auth.login.title",
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
  "en-US missing key falls back to zh-CN",
  getMessage("en-US", "smartChart.reason.multi_period_trend").includes("折线图")
);

assert("en-US scaffold keys subset", [...enKeys].every((k) => zhKeys.includes(k)));

if (failures.length > 0) {
  console.error("\nFAILED:", failures.join("; "));
  process.exit(1);
}

console.log(`\nAll i18n dictionary checks passed (${zhKeys.length} zh-CN keys).`);
