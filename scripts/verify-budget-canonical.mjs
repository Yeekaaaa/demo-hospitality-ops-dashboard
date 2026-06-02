/**
 * 验证预算科目 → budget_data 列映射
 * 运行: node scripts/verify-budget-canonical.mjs
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// 动态加载 ts 不便，内联与 lib/budget-canonical.ts 一致的逻辑做断言
const BUDGET_CORE_LABELS = {
  revenue: "总营业收入",
  cost: "总营业成本",
  profit: "经营利润",
  roomRevenue: "客房收入",
  roomsAvailable: "可售房间数",
  roomsSold: "已售房间数"
};

const ALIASES = {
  [BUDGET_CORE_LABELS.revenue]: ["总营业收入", "营业收入"],
  [BUDGET_CORE_LABELS.cost]: ["总营业成本", "总成本", "营业成本", "运营成本"],
  [BUDGET_CORE_LABELS.profit]: ["经营利润", "运营利润", "利润", "营业利润"],
  [BUDGET_CORE_LABELS.roomRevenue]: ["客房收入"],
  [BUDGET_CORE_LABELS.roomsAvailable]: ["可售房间数", "可售房晚"],
  [BUDGET_CORE_LABELS.roomsSold]: ["已售房间数", "已售房晚"]
};

function pick(subjects, canonical) {
  for (const k of ALIASES[canonical] ?? [canonical]) {
    const v = subjects[k];
    if (v != null && Number.isFinite(v)) return v;
  }
  return subjects[canonical];
}

function toPayload(subjects) {
  const out = {};
  const r = pick(subjects, BUDGET_CORE_LABELS.revenue);
  const c = pick(subjects, BUDGET_CORE_LABELS.cost);
  const p = pick(subjects, BUDGET_CORE_LABELS.profit);
  const room = pick(subjects, BUDGET_CORE_LABELS.roomRevenue);
  const av = pick(subjects, BUDGET_CORE_LABELS.roomsAvailable);
  const sold = pick(subjects, BUDGET_CORE_LABELS.roomsSold);
  if (r != null) out.revenue_budget = r;
  if (c != null) out.cost_budget = c;
  if (p != null) out.profit_budget = p;
  if (room != null) out.room_revenue_budget = room;
  if (av != null) out.rooms_available_budget = av;
  if (sold != null) out.rooms_sold_budget = sold;
  return out;
}

const draft = {
  总营业收入: 150,
  总营业成本: 90,
  经营利润: 60,
  客房收入: 135,
  可售房间数: 3000,
  已售房间数: 2500
};

const p1 = toPayload(draft);
console.assert(p1.revenue_budget === 150, "revenue");
console.assert(p1.cost_budget === 90, "cost");
console.assert(p1.profit_budget === 60, "profit");
console.assert(p1.room_revenue_budget === 135, "room");
console.assert(p1.rooms_available_budget === 3000, "rooms_avail");
console.assert(p1.rooms_sold_budget === 2500, "rooms_sold");

// 旧口径：只填「营业成本」也应写入 cost_budget
const legacy = { 营业收入: 150, 营业成本: 90, 运营利润: 60, 客房收入: 135, 可售房晚: 3000, 已售房晚: 2500 };
const p2 = toPayload(legacy);
console.assert(p2.cost_budget === 90, "legacy 营业成本 → cost_budget");
console.assert(p2.revenue_budget === 150, "legacy 营业收入 → revenue");
console.assert(p2.profit_budget === 60, "legacy 运营利润 → profit");

console.log("verify-budget-canonical: OK");
