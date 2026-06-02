/**
 * 对照 master schema 检查 actual_data 列是否可读写
 * node scripts/verify-actual-data-schema.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env.local"), "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
if (!url || !key) {
  console.error("缺少 .env.local 中的 Supabase 配置");
  process.exit(1);
}

const BASE = [
  "store_id",
  "period_type",
  "period_value",
  "revenue",
  "total_cost",
  "profit",
  "rooms_available",
  "rooms_sold",
  "room_revenue"
];
const EXT = [
  "business_cost",
  "operating_cost",
  "operating_profit",
  "hourly_rooms_sold",
  "overnight_rooms_sold",
  "ota_room_night_ratio",
  "member_room_night_ratio",
  "corporate_customer_ratio",
  "walkin_customer_ratio",
  "direct_sales_ratio",
  "sales_expense",
  "non_room_service_cost",
  "room_service_cost",
  "huazhu_management_fee",
  "rent",
  "tax_and_surcharge",
  "staff_bonus",
  "back_office_bonus",
  "manager_bonus",
  "depreciation_amortization",
  "other_business_income",
  "management_expense",
  "non_operating_income",
  "net_profit",
  "profit_after_amortization",
  "negative_review_count",
  "complaint_count",
  "abnormal_repair_count",
  "staff_turnover_rate",
  "nearby_new_competitor_count"
];
const ALL = [...BASE, ...EXT];

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function probeColumn(col) {
  const u = `${url}/rest/v1/actual_data?select=${col}&limit=1`;
  const res = await fetch(u, { headers });
  if (!res.ok) {
    const t = await res.text();
    return { col, ok: false, err: t.slice(0, 200) };
  }
  return { col, ok: true };
}

async function main() {
  console.log("=== actual_data 列探测（master 扩展 30 + 基础 9）===\n");
  const missing = [];
  for (const col of ALL) {
    const r = await probeColumn(col);
    if (r.ok) console.log(`OK  ${col}`);
    else {
      console.log(`MISS ${col}: ${r.err}`);
      missing.push(col);
    }
  }
  console.log("\n--- 最近导入行 ---");
  const rowsRes = await fetch(
    `${url}/rest/v1/actual_data?select=${ALL.join(",")}&order=period_value.desc&limit=5`,
    { headers }
  );
  if (!rowsRes.ok) {
    console.log("无法读取完整行:", await rowsRes.text());
    process.exit(missing.length ? 1 : 0);
  }
  const rows = await rowsRes.json();
  if (!rows.length) {
    console.log("（暂无数据，请先在经营数据模板页导入测试行）");
  } else {
    for (const row of rows) {
      const filled = ALL.filter((c) => row[c] != null && row[c] !== "");
      const extFilled = EXT.filter((c) => row[c] != null && row[c] !== "");
      console.log(
        `\n门店 ${row.store_id} | ${row.period_type} ${row.period_value}`
      );
      console.log(`  已填列: ${filled.length}/${ALL.length}（扩展 ${extFilled.length}/${EXT.length}）`);
      const emptyExt = EXT.filter((c) => row[c] == null || row[c] === "");
      if (emptyExt.length) console.log(`  扩展空列: ${emptyExt.join(", ")}`);
    }
  }
  if (missing.length) {
    console.log(`\n缺少 ${missing.length} 列，请在 Supabase 执行 sql/ 下迁移文件`);
    process.exit(1);
  }
  console.log("\n全部列存在。");
}

main();
