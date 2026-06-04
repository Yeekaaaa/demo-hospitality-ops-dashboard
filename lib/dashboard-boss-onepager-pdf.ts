/**
 * 老板一页纸：打印友好 HTML → 浏览器「另存为 PDF」（与财务报表页 exportPdf 同源方案）
 */

import { buildBossCockpitBriefing, type CockpitAlertBrief } from "@/lib/dashboard-boss-briefing";
import { calcChange, formatPctOneDecimal } from "@/lib/dashboard-metrics";
import { formatWan, type PeriodGranularity } from "@/lib/mock-analytics";
import type { CockpitSnapshot, CockpitStoreRankingRow } from "@/src/lib/dashboard-data-service";

export type BossOnePagerInput = {
  periodLabel: string;
  scopeLabel: string;
  periodGranularity: PeriodGranularity;
  snapshot: CockpitSnapshot;
  marginPct: number;
  prevMarginPct: number;
  yoyMarginPct: number;
  occCurrent: number;
  occPrev: number;
  occYa: number;
  revCurrent: number;
  revPrev: number;
  revYa: number;
  showOccRevpar: boolean;
  cockpitRows: CockpitStoreRankingRow[];
  alerts: CockpitAlertBrief[];
  profitConclusion: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasAgg(cur: CockpitSnapshot["current"]): boolean {
  return (
    cur.revenue > 0 ||
    cur.totalCost > 0 ||
    cur.profit !== 0 ||
    cur.roomsSold > 0 ||
    cur.roomsAvailable > 0
  );
}

function naIfEmpty(v: string, agg: boolean): string {
  if (!agg) return "暂无数据";
  const t = v.trim();
  if (t === "" || t === "—") return "暂无数据";
  return v;
}

function momYoyLine(
  g: PeriodGranularity,
  cur: number,
  prev: number,
  ya: number,
  agg: boolean
): string {
  if (!agg) return "—";
  const momL = g === "year" ? "较上年" : "环比";
  const mom = formatPctOneDecimal(calcChange(cur, prev));
  const yoy = formatPctOneDecimal(calcChange(cur, ya));
  return `${momL} ${mom} ｜ 同比 ${yoy}`;
}

function top5Rows(
  rows: CockpitStoreRankingRow[],
  sortKey: "revenue" | "profit" | "margin"
): string {
  const list = [...rows].filter((r) => r.revenue > 0);
  if (sortKey === "revenue") list.sort((a, b) => b.revenue - a.revenue);
  else if (sortKey === "profit") list.sort((a, b) => b.profit - a.profit);
  else list.sort((a, b) => b.profit_margin - a.profit_margin);

  const top = list.slice(0, 5);
  if (!top.length) {
    return `<tr><td colspan="6" class="muted">暂无数据</td></tr>`;
  }
  return top
    .map((r, i) => {
      const margin = formatPctOneDecimal(r.profit_margin * 100);
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(r.store_name)}</td>
        <td>${esc(r.store_type_label)}</td>
        <td class="num">${esc(formatWan(r.revenue))}</td>
        <td class="num">${esc(formatWan(r.profit))}</td>
        <td class="num">${esc(margin)}</td>
      </tr>`;
    })
    .join("");
}

function buildHtml(input: BossOnePagerInput): string {
  const {
    periodLabel,
    scopeLabel,
    periodGranularity,
    snapshot,
    marginPct,
    prevMarginPct,
    yoyMarginPct,
    occCurrent,
    occPrev,
    occYa,
    revCurrent,
    revPrev,
    revYa,
    showOccRevpar,
    cockpitRows,
    alerts,
    profitConclusion
  } = input;

  const cur = snapshot.current;
  const prev = snapshot.previous;
  const ya = snapshot.yearAgo;
  const agg = hasAgg(cur);

  const briefing = buildBossCockpitBriefing({
    periodLabel,
    scopeLabel,
    snapshot,
    marginPct,
    rankingRows: cockpitRows,
    alerts
  });

  const exportAt = new Date().toLocaleString("zh-CN", { hour12: false });

  const kpiRows = [
    {
      name: "总收入",
      val: naIfEmpty(formatWan(cur.revenue), agg),
      sub: momYoyLine(periodGranularity, cur.revenue, prev.revenue, ya.revenue, agg)
    },
    {
      name: "总利润",
      val: naIfEmpty(formatWan(cur.profit), agg),
      sub: momYoyLine(periodGranularity, cur.profit, prev.profit, ya.profit, agg)
    },
    {
      name: "利润率",
      val: agg ? formatPctOneDecimal(marginPct) : "暂无数据",
      sub: momYoyLine(periodGranularity, marginPct, prevMarginPct, yoyMarginPct, agg)
    },
    {
      name: "出租率",
      val:
        !showOccRevpar || !agg
          ? "暂无数据"
          : cur.roomsAvailable > 0
            ? formatPctOneDecimal(occCurrent)
            : "暂无数据",
      sub:
        !showOccRevpar || !agg
          ? "—"
          : momYoyLine(periodGranularity, occCurrent, occPrev, occYa, true)
    },
    {
      name: "RevPAR（元/间夜）",
      val:
        !showOccRevpar || !agg
          ? "暂无数据"
          : cur.roomsAvailable > 0
            ? `¥ ${Math.round(revCurrent)}`
            : "暂无数据",
      sub:
        !showOccRevpar || !agg
          ? "—"
          : momYoyLine(periodGranularity, revCurrent, revPrev, revYa, true)
    }
  ];

  const kpiTable = kpiRows
    .map(
      (r) => `<tr>
      <td>${esc(r.name)}</td>
      <td class="num strong">${esc(r.val)}</td>
      <td class="small muted">${esc(r.sub)}</td>
    </tr>`
    )
    .join("");

  const briefingHtml = briefing
    .map(
      (b, i) => `<div class="brief-item">
      <span class="brief-no">${i + 1}</span>
      <div><span class="brief-head">${esc(b.heading)}</span> — ${esc(b.body)}</div>
    </div>`
    )
    .join("");

  const alertsHtml =
    alerts.length === 0
      ? `<p class="muted">本期未触发自动预警规则。</p>`
      : `<ul class="alert-list">${alerts
          .map(
            (a) =>
              `<li><span class="tag ${a.level === "严重" ? "tag-crit" : "tag-warn"}">${esc(a.level)}</span>
            ${esc(a.store)} ｜ ${esc(a.desc)} ｜ ${esc(a.action)}</li>`
          )
          .join("")}</ul>`;

  const pbRows = [
    { k: "总收入", v: agg ? formatWan(cur.revenue) : "暂无数据" },
    { k: "总成本", v: agg ? formatWan(cur.totalCost) : "暂无数据" },
    { k: "总利润", v: agg ? formatWan(cur.profit) : "暂无数据" },
    { k: "利润率", v: agg ? formatPctOneDecimal(marginPct) : "暂无数据" },
    { k: "经营结论", v: profitConclusion }
  ];
  const profitTable = pbRows
    .map((r) => `<tr><td>${esc(r.k)}</td><td class="num" style="text-align:left">${esc(r.v)}</td></tr>`)
    .join("");

  const docTitle = `示例经营驾驶舱-管理层简报-${periodLabel.replace(/\s/g, "")}`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${esc(docTitle)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0 0 24px;
      font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif;
      font-size: 11px;
      line-height: 1.55;
      color: #0f172a;
      background: #fff;
    }
    .masthead {
      border-bottom: 3px solid #1e3a5f;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .masthead h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #1e3a5f;
    }
    .masthead .sub { margin-top: 4px; font-size: 11px; color: #475569; }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
      font-size: 10px;
      color: #334155;
      margin-bottom: 14px;
      padding: 8px 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .sec {
      margin-bottom: 14px;
      break-inside: avoid;
    }
    .sec h2 {
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 700;
      color: #1e3a5f;
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 3px;
    }
    table.data {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    table.data th, table.data td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      text-align: left;
      vertical-align: top;
    }
    table.data th { background: #e2e8f0; font-weight: 600; color: #1e293b; }
    table.data tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 600; }
    .small { font-size: 9px; }
    .muted { color: #64748b; }
    .brief-item { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
    .brief-no {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      background: #1e3a5f;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      border-radius: 2px;
    }
    .brief-head { font-weight: 700; color: #0f172a; }
    .alert-list { margin: 0; padding-left: 18px; }
    .alert-list li { margin-bottom: 4px; }
    .tag {
      display: inline-block;
      padding: 0 5px;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 600;
      margin-right: 4px;
    }
    .tag-crit { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .tag-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .footer-note {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px dashed #94a3b8;
      font-size: 9px;
      color: #64748b;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="masthead">
    <h1>经营驾驶舱 · 老板一页纸</h1>
    <div class="sub">示例酒店餐饮经营管理平台 · 管理层简报 · 演示资料</div>
  </div>
  <div class="meta-bar">
    <span><strong>账期</strong>：${esc(periodLabel)}</span>
    <span><strong>门店范围</strong>：${esc(scopeLabel)}</span>
    <span><strong>导出时间</strong>：${esc(exportAt)}</span>
  </div>

  <div class="sec">
    <h2>一、核心 KPI</h2>
    <table class="data">
      <thead><tr><th style="width:22%">指标</th><th style="width:28%">本期</th><th>环比与同比（%，相对上一周期 / 去年同期）</th></tr></thead>
      <tbody>${kpiTable}</tbody>
    </table>
  </div>

  <div class="sec">
    <h2>二、经营问答摘要</h2>
    ${briefingHtml}
  </div>

  <div class="sec">
    <h2>三、门店 Top 5（收入）</h2>
    <table class="data">
      <thead><tr><th>#</th><th>门店</th><th>业态</th><th>收入</th><th>利润</th><th>利润率</th></tr></thead>
      <tbody>${top5Rows(cockpitRows, "revenue")}</tbody>
    </table>
  </div>
  <div class="sec">
    <h2>四、门店 Top 5（利润）</h2>
    <table class="data">
      <thead><tr><th>#</th><th>门店</th><th>业态</th><th>收入</th><th>利润</th><th>利润率</th></tr></thead>
      <tbody>${top5Rows(cockpitRows, "profit")}</tbody>
    </table>
  </div>
  <div class="sec">
    <h2>五、门店 Top 5（利润率）</h2>
    <table class="data">
      <thead><tr><th>#</th><th>门店</th><th>业态</th><th>收入</th><th>利润</th><th>利润率</th></tr></thead>
      <tbody>${top5Rows(cockpitRows, "margin")}</tbody>
    </table>
  </div>

  <div class="sec">
    <h2>六、异常预警</h2>
    ${alertsHtml}
  </div>

  <div class="sec">
    <h2>七、利润拆解</h2>
    <table class="data">
      <tbody>${profitTable}</tbody>
    </table>
  </div>

  <p class="footer-note">说明：本页数据与驾驶舱看板同源；请在打印对话框中选择「另存为 PDF」完成归档。数值单位与线上一致（金额底层为元，展示为万元；百分比：保留一位小数）。</p>
</body>
</html>`;
}

export function exportBossOnePagerPdf(input: BossOnePagerInput): void {
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return;
  win.document.write(buildHtml(input));
  win.document.close();
  win.focus();
  win.print();
}
