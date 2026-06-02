/**
 * 异常预警中心：基于 actual_data 当前账期 + 上期行数据的规则引擎（纯函数）
 */

import { calcChange, formatPctOneDecimal } from "@/lib/dashboard-metrics";
import { formatWan } from "@/lib/mock-analytics";

export type RiskSeverity = "红灯" | "黄灯" | "绿灯";

export type RiskAlertTableRow = {
  id: string;
  预警项目: string;
  门店: string;
  当前值: string;
  预警标准: string;
  预警等级: RiskSeverity;
  原因初判: string;
  是否需要专题会: "是" | "否";
  建议责任人: string;
  处理进度: string;
};

function num(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function storeName(row: Record<string, unknown>): string {
  const st = row.stores as { name?: string | null } | null | undefined;
  const n = st?.name?.trim();
  return n && n.length > 0 ? n : String(row.store_id ?? "未知门店");
}

/** 客房收入（元）→ ADR（元） */
function adrYuan(row: Record<string, unknown>): number | null {
  const rr = num(row, "room_revenue");
  const sold = num(row, "rooms_sold");
  if (rr == null || sold == null || sold <= 0) return null;
  return rr / sold;
}

/** 客房收入（元）→ RevPAR（元/间夜） */
function revparYuan(row: Record<string, unknown>): number | null {
  const rr = num(row, "room_revenue");
  const avail = num(row, "rooms_available");
  if (rr == null || avail == null || avail <= 0) return null;
  return rr / avail;
}

/** GOP 率：存库为 0–1 或 0–100 均兼容 */
function gopMarginNormalized(row: Record<string, unknown>): number | null {
  const g = num(row, "gop_margin");
  if (g == null) return null;
  if (g > 1) return g / 100;
  return g;
}

function laborRatioNorm(row: Record<string, unknown>): number | null {
  const r = num(row, "labor_cost_ratio");
  if (r == null) return null;
  return r > 1 ? r / 100 : r;
}

function energyRatioNorm(row: Record<string, unknown>): number | null {
  const r = num(row, "energy_cost_ratio");
  if (r == null) return null;
  return r > 1 ? r / 100 : r;
}

function otaRatioNorm(row: Record<string, unknown>): number | null {
  const r = num(row, "ota_room_night_ratio");
  if (r == null) return null;
  return r > 1 ? r / 100 : r;
}

function memberRatioNorm(row: Record<string, unknown>): number | null {
  const r = num(row, "member_room_night_ratio");
  if (r == null) return null;
  return r > 1 ? r / 100 : r;
}

function ownerForRule(ruleKey: string): string {
  switch (ruleKey) {
    case "revpar":
    case "adr":
    case "ota":
      return "收益管理负责人";
    case "gop":
      return "店总 / 运营负责人";
    case "labor":
      return "人力与店总";
    case "energy":
      return "工程物业负责人";
    case "member_gop":
      return "店总、财务与收益管理";
    case "review":
    case "complaint":
      return "店总、前厅与客服";
    case "cashflow":
      return "财务负责人";
    case "competitor":
      return "店总 / 开发与市场";
    default:
      return "店总";
  }
}

let idSeq = 0;
function nid(): string {
  idSeq += 1;
  return `risk-${Date.now()}-${idSeq}`;
}

export type RiskAlertBuildInput = {
  currentRows: Record<string, unknown>[];
  previousRows: Record<string, unknown>[];
};

/**
 * 仅输出黄灯 / 红灯项（绿灯不在清单中列出）；无触发时返回空数组。
 */
export function buildRiskAlerts(input: RiskAlertBuildInput): RiskAlertTableRow[] {
  const { currentRows, previousRows } = input;
  const prevByStore = new Map<string, Record<string, unknown>>();
  for (const r of previousRows) {
    const sid = String(r.store_id ?? "");
    if (sid) prevByStore.set(sid, r);
  }

  const out: RiskAlertTableRow[] = [];

  for (const row of currentRows) {
    const sid = String(row.store_id ?? "");
    const name = storeName(row);
    const prev = sid ? prevByStore.get(sid) : undefined;

    const rpCur = revparYuan(row);
    const rpPrev = prev ? revparYuan(prev) : null;
    if (rpCur != null && rpPrev != null && rpPrev > 0) {
      const ch = calcChange(rpCur, rpPrev);
      if (ch < -10) {
        out.push({
          id: nid(),
          预警项目: "RevPAR 环比",
          门店: name,
          当前值: `RevPAR ¥${Math.round(rpCur)}，环比 ${formatPctOneDecimal(ch)}`,
          预警标准: "环比下降超过 10% 为红灯；超过 5% 为黄灯",
          预警等级: "红灯",
          原因初判: "量价或出租率承压，需区分渠道与协议结构变化。",
          是否需要专题会: "是",
          建议责任人: ownerForRule("revpar"),
          处理进度: "待登记"
        });
      } else if (ch < -5) {
        out.push({
          id: nid(),
          预警项目: "RevPAR 环比",
          门店: name,
          当前值: `RevPAR ¥${Math.round(rpCur)}，环比 ${formatPctOneDecimal(ch)}`,
          预警标准: "环比下降超过 10% 为红灯；超过 5% 为黄灯",
          预警等级: "黄灯",
          原因初判: "需求或价格策略存在波动，建议结合入住率拆解。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("revpar"),
          处理进度: "待登记"
        });
      }
    }

    const adrCur = adrYuan(row);
    const adrPrev = prev ? adrYuan(prev) : null;
    if (adrCur != null && adrPrev != null && adrPrev > 0) {
      const ch = calcChange(adrCur, adrPrev);
      if (ch < -5) {
        out.push({
          id: nid(),
          预警项目: "ADR 环比",
          门店: name,
          当前值: `ADR ¥${Math.round(adrCur)}，环比 ${formatPctOneDecimal(ch)}`,
          预警标准: "ADR 环比下降超过 5% 为黄灯（暂无预算 ADR 字段时仅看环比）",
          预警等级: "黄灯",
          原因初判: "房价结构或折扣深度可能变化，建议复核协议价与 OTA 促销。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("adr"),
          处理进度: "待登记"
        });
      }
    }

    const gm = gopMarginNormalized(row);
    if (gm != null) {
      if (gm < 0.1) {
        out.push({
          id: nid(),
          预警项目: "GOP 率",
          门店: name,
          当前值: formatPctOneDecimal(gm * 100),
          预警标准: "GOP 率低于 10% 红灯；低于 20% 黄灯",
          预警等级: "红灯",
          原因初判: "利润垫偏薄，收入质量或成本纪律需重点复盘。",
          是否需要专题会: "是",
          建议责任人: ownerForRule("gop"),
          处理进度: "待登记"
        });
      } else if (gm < 0.2) {
        out.push({
          id: nid(),
          预警项目: "GOP 率",
          门店: name,
          当前值: formatPctOneDecimal(gm * 100),
          预警标准: "GOP 率低于 10% 红灯；低于 20% 黄灯",
          预警等级: "黄灯",
          原因初判: "仍有利润优化与结构调优空间。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("gop"),
          处理进度: "待登记"
        });
      }
    }

    const lr = laborRatioNorm(row);
    if (lr != null) {
      if (lr > 0.3) {
        out.push({
          id: nid(),
          预警项目: "人工成本率",
          门店: name,
          当前值: formatPctOneDecimal(lr * 100),
          预警标准: "高于 30% 红灯；高于 25% 黄灯",
          预警等级: "红灯",
          原因初判: "人效与排班弹性可能不足，或收入端未同步放大。",
          是否需要专题会: "是",
          建议责任人: ownerForRule("labor"),
          处理进度: "待登记"
        });
      } else if (lr > 0.25) {
        out.push({
          id: nid(),
          预警项目: "人工成本率",
          门店: name,
          当前值: formatPctOneDecimal(lr * 100),
          预警标准: "高于 30% 红灯；高于 25% 黄灯",
          预警等级: "黄灯",
          原因初判: "用工结构与产出匹配度仍可优化。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("labor"),
          处理进度: "待登记"
        });
      }
    }

    const er = energyRatioNorm(row);
    if (er != null) {
      if (er > 0.1) {
        out.push({
          id: nid(),
          预警项目: "能耗成本率",
          门店: name,
          当前值: formatPctOneDecimal(er * 100),
          预警标准: "高于 10% 红灯；高于 8% 黄灯",
          预警等级: "红灯",
          原因初判: "能耗异常或产能利用不足，建议工程巡检与能耗对标。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("energy"),
          处理进度: "待登记"
        });
      } else if (er > 0.08) {
        out.push({
          id: nid(),
          预警项目: "能耗成本率",
          门店: name,
          当前值: formatPctOneDecimal(er * 100),
          预警标准: "高于 10% 红灯；高于 8% 黄灯",
          预警等级: "黄灯",
          原因初判: "能源与运维仍有节降空间。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("energy"),
          处理进度: "待登记"
        });
      }
    }

    const ota = otaRatioNorm(row);
    if (ota != null) {
      if (ota > 0.4) {
        out.push({
          id: nid(),
          预警项目: "OTA 间夜占比",
          门店: name,
          当前值: formatPctOneDecimal(ota * 100),
          预警标准: "高于 40% 红灯；高于 30% 黄灯",
          预警等级: "红灯",
          原因初判: "渠道佣金压力偏高，直销与会员承接不足。",
          是否需要专题会: "是",
          建议责任人: ownerForRule("ota"),
          处理进度: "待登记"
        });
      } else if (ota > 0.3) {
        out.push({
          id: nid(),
          预警项目: "OTA 间夜占比",
          门店: name,
          当前值: formatPctOneDecimal(ota * 100),
          预警标准: "高于 40% 红灯；高于 30% 黄灯",
          预警等级: "黄灯",
          原因初判: "渠道结构具备向会员与协议迁移的优化空间。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("ota"),
          处理进度: "待登记"
        });
      }
    }

    if (prev) {
      const mCur = memberRatioNorm(row);
      const mPrev = memberRatioNorm(prev);
      const gCur = gopMarginNormalized(row);
      const gPrev = gopMarginNormalized(prev);
      if (
        mCur != null &&
        mPrev != null &&
        gCur != null &&
        gPrev != null &&
        mCur > mPrev + 0.005 &&
        gCur < gPrev - 0.005
      ) {
        out.push({
          id: nid(),
          预警项目: "会员占比上升但 GOP 率下降",
          门店: name,
          当前值: `会员间夜占比 ${formatPctOneDecimal(mCur * 100)}（上期 ${formatPctOneDecimal(mPrev * 100)}），GOP 率 ${formatPctOneDecimal(gCur * 100)}（上期 ${formatPctOneDecimal(gPrev * 100)}）`,
          预警标准: "会员占比上升同时 GOP 率下降",
          预警等级: "红灯",
          原因初判: "会员折扣或权益成本可能侵蚀利润，需复核定价与套餐设计。",
          是否需要专题会: "是",
          建议责任人: ownerForRule("member_gop"),
          处理进度: "待登记"
        });
      }
    }

    const neg = num(row, "negative_review_count");
    if (neg != null) {
      if (neg > 40) {
        out.push({
          id: nid(),
          预警项目: "差评数",
          门店: name,
          当前值: String(neg),
          预警标准: "超过 40 红灯；超过 30 黄灯",
          预警等级: "红灯",
          原因初判: "体验口碑承压，需服务与产品双端整改。",
          是否需要专题会: "是",
          建议责任人: ownerForRule("review"),
          处理进度: "待登记"
        });
      } else if (neg > 30) {
        out.push({
          id: nid(),
          预警项目: "差评数",
          门店: name,
          当前值: String(neg),
          预警标准: "超过 40 红灯；超过 30 黄灯",
          预警等级: "黄灯",
          原因初判: "舆情与体验存在改进窗口。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("review"),
          处理进度: "待登记"
        });
      }
    }

    const comp = num(row, "complaint_count");
    if (comp != null) {
      if (comp > 15) {
        out.push({
          id: nid(),
          预警项目: "投诉数",
          门店: name,
          当前值: String(comp),
          预警标准: "超过 15 红灯；超过 10 黄灯",
          预警等级: "红灯",
          原因初判: "服务流程或现场执行波动较大。",
          是否需要专题会: "是",
          建议责任人: ownerForRule("complaint"),
          处理进度: "待登记"
        });
      } else if (comp > 10) {
        out.push({
          id: nid(),
          预警项目: "投诉数",
          门店: name,
          当前值: String(comp),
          预警标准: "超过 15 红灯；超过 10 黄灯",
          预警等级: "黄灯",
          原因初判: "客户触点需加强闭环与复盘。",
          是否需要专题会: "否",
          建议责任人: ownerForRule("complaint"),
          处理进度: "待登记"
        });
      }
    }

    const ocf = num(row, "operating_cash_flow");
    if (ocf != null && ocf < 0) {
      out.push({
        id: nid(),
        预警项目: "经营现金流",
        门店: name,
        当前值: `${formatWan(ocf)} 万元`,
        预警标准: "经营现金流为负",
        预警等级: "红灯",
        原因初判: "经营造血承压，需联动应收、应付与资本开支节奏。",
        是否需要专题会: "是",
        建议责任人: ownerForRule("cashflow"),
        处理进度: "待登记"
      });
    }

    const compN = num(row, "nearby_new_competitor_count");
    if (compN != null && compN >= 3) {
      out.push({
        id: nid(),
        预警项目: "同商圈新增竞品",
        门店: name,
        当前值: String(compN),
        预警标准: "新增竞品数 ≥ 3",
        预警等级: "红灯",
        原因初判: "供给增加可能分流客源与房价，需更新竞争策略。",
        是否需要专题会: "是",
        建议责任人: ownerForRule("competitor"),
        处理进度: "待登记"
      });
    }
  }

  return out;
}
