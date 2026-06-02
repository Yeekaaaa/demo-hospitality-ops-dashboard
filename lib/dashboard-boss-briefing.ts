/**
 * 老板经营问答摘要：基于驾驶舱聚合、排行与预警的规则文案（不调 AI）
 * 高管决策版：四段式、判断句、短句压缩。
 */

import { calcChange, formatPctOneDecimal } from "@/lib/dashboard-metrics";
import type { CockpitSnapshot, CockpitStoreRankingRow } from "@/src/lib/dashboard-data-service";

export type CockpitAlertBrief = {
  level: "严重" | "注意";
  store: string;
  desc: string;
  action: string;
};

export type BuildBossBriefingArgs = {
  periodLabel: string;
  scopeLabel: string;
  snapshot: CockpitSnapshot;
  marginPct: number;
  rankingRows: CockpitStoreRankingRow[];
  alerts: CockpitAlertBrief[];
};

export type BossBriefingLine = { heading: string; body: string };

const L25 = 25;
const L28 = 28;

function hasMeaningfulAggregate(s: CockpitSnapshot["current"]): boolean {
  return (
    s.revenue > 0 ||
    s.totalCost > 0 ||
    s.profit !== 0 ||
    s.roomsSold > 0 ||
    s.roomsAvailable > 0
  );
}

function topByRevenue(rows: CockpitStoreRankingRow[]): CockpitStoreRankingRow | null {
  const list = rows.filter((r) => r.revenue > 0);
  if (!list.length) return null;
  return [...list].sort((a, b) => b.revenue - a.revenue)[0] ?? null;
}

function topByProfit(rows: CockpitStoreRankingRow[]): CockpitStoreRankingRow | null {
  const list = rows.filter((r) => r.revenue > 0);
  if (!list.length) return null;
  return [...list].sort((a, b) => b.profit - a.profit)[0] ?? null;
}

function sumRevenue(rows: CockpitStoreRankingRow[]): number {
  return rows.reduce((s, r) => s + Math.max(0, r.revenue), 0);
}

function sharePct(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return "—";
  return formatPctOneDecimal((part / total) * 100);
}

function revenueConcentrationRatio(top: CockpitStoreRankingRow | null, rows: CockpitStoreRankingRow[]): number {
  const t = sumRevenue(rows);
  if (!top || t <= 0) return 0;
  return top.revenue / t;
}

function rowByName(rows: CockpitStoreRankingRow[], store: string): CockpitStoreRankingRow | undefined {
  return rows.find((r) => r.store_name === store);
}

/** 店名极短化，便于塞进 25 字句 */
function shortStore(name: string): string {
  const t = name.replace(/｜/g, "").replace(/\s/g, "");
  if (t.length <= 4) return t;
  return `${t.slice(0, 3)}…`;
}

function wanShort(n: number): string {
  const v = Math.abs(n) >= 100 ? String(Math.round(n)) : n.toFixed(1);
  return `${v}万`;
}

function pctInt(n: number): string {
  return `${Math.round(n)}%`;
}

/** 句长上限：超出则截断加 … */
function fit(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(1, max - 1)) + "…";
}

function buildConclusion(args: BuildBossBriefingArgs): string {
  const { scopeLabel, snapshot, marginPct, alerts } = args;
  const cur = snapshot.current;
  const prev = snapshot.previous;
  const ya = snapshot.yearAgo;

  const revenueMom = calcChange(cur.revenue, prev.revenue);
  const profitMom = calcChange(cur.profit, prev.profit);
  const revenueYoy = calcChange(cur.revenue, ya.revenue);

  if (!hasMeaningfulAggregate(cur)) {
    return fit(`${scopeLabel}口径无有效数，3日内财务须补全`, L25);
  }

  const hasCrit = alerts.some((a) => a.level === "严重");

  let s: string;
  if (hasCrit) {
    s = `红线已亮，当周须锁现金与纠偏`;
  } else if (cur.profit < 0) {
    s = `聚合仍亏${wanShort(cur.profit)}，周内需止血`;
  } else if (marginPct < 5 && revenueMom < -3) {
    s = `利薄且收跌${pctInt(revenueMom)}，先砍尾店变动成本`;
  } else if (marginPct < 5) {
    s = `利润率${pctInt(marginPct)}过低，先控人耗与能耗`;
  } else if (revenueMom < -5) {
    s = `收跌${pctInt(Math.abs(revenueMom))}，${revenueYoy < 0 ? "同弱" : "同稳"}，当周重谈渠道`;
  } else if (profitMom < -8 && cur.profit >= 0) {
    s = `利环降${pctInt(Math.abs(profitMom))}，一次性费用须5日内核清`;
  } else if (marginPct >= 15) {
    s = `利垫厚，本月可加码增收试点`;
  } else {
    s = `温饱可控，三日内销完预警`;
  }

  return fit(s, L25);
}

function buildJudgments(args: BuildBossBriefingArgs, revTop: CockpitStoreRankingRow | null): string[] {
  const { rankingRows, snapshot } = args;
  const out: string[] = [];
  const totalRev = sumRevenue(rankingRows);

  if (revTop && totalRev > 0) {
    const sh = sharePct(revTop.revenue, totalRev);
    const conc = revenueConcentrationRatio(revTop, rankingRows);
    const dep = conc >= 0.35 ? "存单店依赖" : conc >= 0.25 ? "集中度中等" : "收较分散";
    out.push(fit(`${shortStore(revTop.store_name)}占收${sh}，${dep}`, L25));
  } else {
    out.push(fit(`Top收缺失，三日内补录营收`, L25));
  }

  const profTop = topByProfit(rankingRows);
  if (profTop && revTop) {
    if (profTop.store_id !== revTop.store_id) {
      out.push(fit(`利在${shortStore(profTop.store_name)}、收在${shortStore(revTop.store_name)}，定价须拆`, L25));
    } else {
      const { hotelRevenue, restaurantRevenue, otherRevenue } = snapshot.structure;
      const t = hotelRevenue + restaurantRevenue + otherRevenue;
      if (t > 0) {
        const hp = (hotelRevenue / t) * 100;
        const rp = (restaurantRevenue / t) * 100;
        const dom = hp >= 58 ? `酒收主导${pctInt(hp)}` : rp >= 58 ? `餐收主导${pctInt(rp)}` : `酒餐双轨各半`;
        out.push(fit(`${dom}，业态波动须分拆盯`, L25));
      } else {
        out.push(fit(`龙头店利收同体，可横向复制`, L25));
      }
    }
  } else if (profTop) {
    out.push(fit(`${shortStore(profTop.store_name)}领跑利润，尾店须对标`, L25));
  }

  return out.slice(0, 2);
}

function buildRiskLines(args: BuildBossBriefingArgs): string[] {
  const { alerts, rankingRows } = args;
  const lines: string[] = [];

  const crit = alerts.find((a) => a.level === "严重");
  if (crit) {
    const r = rowByName(rankingRows, crit.store);
    const num = r ? wanShort(r.profit) : "—";
    lines.push(fit(`🔴${shortStore(crit.store)}亏${num}，3日内盘账`, L28));
  }

  const warn = alerts.find((a) => a.level === "注意");
  if (warn && lines.length < 2) {
    const r = rowByName(rankingRows, warn.store);
    const line =
      r && r.mom_profit_change_pct < -1
        ? `🟡${shortStore(warn.store)}利环降${pctInt(Math.abs(r.mom_profit_change_pct))}%，5日内复盘`
        : r
          ? `🟡${shortStore(warn.store)}利${pctInt(r.profit_margin * 100)}%，5日内复盘`
          : `🟡${shortStore(warn.store)}预警，5日内复盘`;
    lines.push(fit(line, L28));
  }

  if (lines.length >= 2) return lines.slice(0, 2);

  const loss = [...rankingRows].filter((x) => x.profit < 0).sort((a, b) => a.profit - b.profit)[0];
  if (loss && !lines.some((l) => l.includes(shortStore(loss.store_name)))) {
    lines.push(fit(`🟡${shortStore(loss.store_name)}亏${wanShort(loss.profit)}，5日内复盘`, L28));
  }

  if (lines.length >= 2) return lines.slice(0, 2);

  const thin = [...rankingRows]
    .filter((x) => x.revenue > 0 && x.profit_margin * 100 < 8)
    .sort((a, b) => a.profit_margin - b.profit_margin)[0];
  if (thin && lines.length < 2 && !lines.some((l) => l.includes(shortStore(thin.store_name)))) {
    lines.push(
      fit(`🟡${shortStore(thin.store_name)}利${pctInt(thin.profit_margin * 100)}，7日内降本`, L28)
    );
  }

  if (lines.length === 0) {
    lines.push(fit(`🟡样本未触红线，3日内自检填报`, L28));
  }
  if (lines.length === 1) {
    lines.push(fit(`🟡周会须过一遍尾店利差`, L28));
  }

  return lines.slice(0, 2);
}

function buildActionLines(args: BuildBossBriefingArgs, revenueMom: number, profitMom: number): string[] {
  const { snapshot, marginPct, alerts } = args;
  const cur = snapshot.current;
  const pieces: string[] = [];

  if (alerts.some((a) => a.level === "严重")) {
    const st = shortStore([...new Set(alerts.filter((a) => a.level === "严重").map((a) => a.store))][0] ?? "红线店");
    pieces.push(fit(`财务总监3日内锁${st}现金流`, L25));
    pieces.push(fit(`店长本周内交纠偏单`, L25));
  } else if (alerts.length > 0) {
    pieces.push(fit(`运营负责人5日内销预警表`, L25));
    pieces.push(fit(`责任店长3日内填根因`, L25));
  }

  if (cur.profit < 0 && pieces.length < 3) {
    pieces.push(fit(`财务本周内出保本线测算`, L25));
  } else if (marginPct < 5 && pieces.length < 3) {
    pieces.push(fit(`人力与店长7日内出人耗对标`, L25));
  } else if (marginPct >= 15 && pieces.length < 3) {
    pieces.push(fit(`市场负责人本月内做增收试点`, L25));
  }

  if (revenueMom < -5 && pieces.length < 3) {
    pieces.push(fit(`运营负责人5日内完成价策复盘`, L25));
  }
  if (profitMom < -8 && cur.profit >= 0 && pieces.length < 3) {
    pieces.push(fit(`财务5日内核一次性费用`, L25));
  }

  if (pieces.length === 0) {
    pieces.push(fit(`运营负责人本月内盯尾店灯号`, L25));
    pieces.push(fit(`店长下周内报红黄绿自评`, L25));
  }

  return pieces.slice(0, 3).map((p) => fit(p, L25));
}

export function buildBossCockpitBriefing(args: BuildBossBriefingArgs): readonly BossBriefingLine[] {
  const { snapshot, rankingRows } = args;
  const cur = snapshot.current;
  const prev = snapshot.previous;
  const revenueMom = calcChange(cur.revenue, prev.revenue);
  const profitMom = calcChange(cur.profit, prev.profit);

  const revTop = topByRevenue(rankingRows);
  const judgments = buildJudgments(args, revTop);
  const risks = buildRiskLines(args);
  const actions = buildActionLines(args, revenueMom, profitMom);

  return [
    { heading: "一句话结论", body: buildConclusion(args) },
    {
      heading: "关键判断",
      body: judgments.length > 1 ? `${judgments[0]}；${judgments[1]}` : judgments[0] ?? "—"
    },
    { heading: "风险", body: risks.length > 1 ? `${risks[0]}；${risks[1]}` : risks[0] ?? "—" },
    { heading: "行动", body: actions.join("；") }
  ] as const;
}
