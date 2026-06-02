/**
 * 经营分析页（投融资 / 增长导向叙事）——纯规则文案，无 Supabase
 */

import { calcChange, formatPctOneDecimal } from "@/lib/dashboard-metrics";
import type { ActualDataAssetScreen } from "@/lib/actual-data-asset-aggregate";
import { formatWan } from "@/lib/mock-analytics";
import type { CockpitSnapshot } from "@/src/lib/dashboard-data-service";

export type CockpitAlertItem = {
  level: "严重" | "注意";
  store: string;
  desc: string;
  action: string;
};

/** 展示用：弱化「严重」措辞，面向投资人沟通 */
export function alertPriorityLabel(level: CockpitAlertItem["level"]): string {
  return level === "严重" ? "高优先级关注" : "改进关注";
}

export function hasAggregateSignal(cur: CockpitSnapshot["current"]): boolean {
  return (
    cur.revenue > 0 ||
    cur.totalCost > 0 ||
    cur.profit !== 0 ||
    cur.roomsSold > 0 ||
    cur.roomsAvailable > 0
  );
}

export function buildInvestmentHighlights(params: {
  snapshot: CockpitSnapshot;
  marginPct: number;
  lossStoreCount: number;
  alertCount: number;
  highTierN: number;
  topRevenueName: string | null;
}): { tagline: string; bullets: string[] } {
  const { snapshot, marginPct, lossStoreCount, alertCount, highTierN, topRevenueName } = params;
  const cur = snapshot.current;
  const prev = snapshot.previous;

  if (!hasAggregateSignal(cur)) {
    return {
      tagline: "待数据完整呈现后，可进一步评估规模、盈利质量与扩张节奏的匹配度。",
      bullets: [
        "当前账期在可见聚合范围内信息尚薄，建议完成关账与数据同步后再做投资价值判断。",
        "已具备与驾驶舱一致的口径框架，数据到位后可快速复用本页结构输出投资备忘录。",
        "建议将「收入结构 + 门店梯队」作为后续尽调与路演的主线之一。",
        "管理层可先行固化经营数据治理节奏，为后续融资与并购对话预留可信度空间。"
      ]
    };
  }

  const revMom = formatPctOneDecimal(calcChange(cur.revenue, prev.revenue));
  const tagline =
    cur.profit >= 0 && marginPct >= 15
      ? `在 ${formatWan(cur.revenue)} 的收入体量与 ${formatPctOneDecimal(marginPct)} 的综合利润率组合下，公司具备较扎实的盈利基础与再投资弹性。`
      : cur.profit >= 0
        ? `本期收入 ${formatWan(cur.revenue)}、利润 ${formatWan(cur.profit)}，在 ${formatPctOneDecimal(marginPct)} 的利润率水平上仍具备通过效率提升释放利润的空间。`
        : `本期收入 ${formatWan(cur.revenue)}，利润端仍处于爬坡阶段；在收入底盘具备的前提下，可通过结构优化与运营提效改善盈利表现。`;

  const b1 = `收入动能：相对上一账期约 ${revMom}，体现需求与定价的综合走势，可作为增长叙事的起点。`;
  const b2 = topRevenueName
    ? `「${topRevenueName}」等头部门店已构成可复制的收入样板，具备向同业态外溢的潜力。`
    : "门店收入梯队仍在形成中，后续可重点识别可复制的收入样板店。";
  const b3 =
    highTierN > 0
      ? `高利润率门店共 ${highTierN} 家，为利润扩张与资本回报提供了可放大的经营支点。`
      : "利润率结构仍有优化空间，亦意味着通过运营提效可兑现的增量利润潜力。";
  const b4 =
    alertCount > 0
      ? `经营扫描识别 ${alertCount} 项可优先配置管理资源的改进抓手，详见「风险与短板」章节，便于投资人理解治理动作清单。`
      : lossStoreCount > 0
        ? `部分门店尚处于利润爬坡期（共 ${lossStoreCount} 家），在收入底盘稳定的前提下，具备通过成本与产品组合优化改善回报的基础。`
        : "门店层面盈利分布相对均衡，为后续结构性优化预留管理抓手。";

  return { tagline, bullets: [b1, b2, b3, b4] };
}

export function buildBusinessPerformanceIntro(snapshot: CockpitSnapshot): string {
  const cur = snapshot.current;
  if (!hasAggregateSignal(cur)) {
    return "以下经营表现待数据补全后将进一步展开；口径与驾驶舱 cockpit 聚合一致。";
  }
  return `以下从收入规模、结构与环比动能呈现经营表现（观察期：与顶部账期一致）。在「利润 ≈ 收入 − 成本」框架下，收入与成本变动将共同塑造利润路径。`;
}

export function buildInvestorRevenueConclusion(
  snapshot: CockpitSnapshot,
  topStoreName: string | null
): string {
  const s = snapshot.structure;
  const sum = s.hotelRevenue + s.restaurantRevenue + s.otherRevenue;
  if (sum <= 0 && snapshot.current.revenue <= 0) {
    return "收入结构信息尚待完善，后续可重点呈现酒店与餐饮的协同贡献，以支撑增长故事线。";
  }
  const denom = Math.max(sum, snapshot.current.revenue, 1e-9);
  const h = (s.hotelRevenue / denom) * 100;
  const r = (s.restaurantRevenue / denom) * 100;
  const o = Math.max(0, 100 - h - r);
  const tail = topStoreName
    ? `「${topStoreName}」等门店已展现收入牵引力，可作为产品组合与渠道策略的标杆样本。`
    : "随着门店收入数据颗粒度提升，可进一步识别具备外溢能力的收入龙头。";
  if (h >= 55) {
    return `收入结构以酒店为主（酒店约 ${formatPctOneDecimal(h)}、餐饮约 ${formatPctOneDecimal(r)}、其他约 ${formatPctOneDecimal(o)}），具备依托住宿场景延伸餐饮与其他服务的协同基础。${tail}`;
  }
  if (r >= 40) {
    return `餐饮收入占比较高（酒店约 ${formatPctOneDecimal(h)}、餐饮约 ${formatPctOneDecimal(r)}），具备在客流与供应链上做深做强的空间。${tail}`;
  }
  return `酒店与餐饮收入相对均衡（酒店约 ${formatPctOneDecimal(h)}、餐饮约 ${formatPctOneDecimal(r)}），为多业态联动与交叉销售提供了良好基础。${tail}`;
}

export function buildInvestorProfitabilityConclusion(
  snapshot: CockpitSnapshot,
  marginPct: number,
  highN: number,
  midN: number,
  lowN: number,
  occ: number,
  revpar: number,
  hasHotelMetrics: boolean
): string {
  if (!hasAggregateSignal(snapshot.current)) {
    return "盈利能力与效率指标将在数据完整后进一步呈现。";
  }
  const tier =
    highN >= midN && highN >= lowN
      ? "门店利润率结构偏优质，具备将成功经验横向复制的管理基础。"
      : midN >= lowN
        ? "中等利润率门店占主体，整体仍具备向高利润率梯队迁移的提升空间。"
        : "门店利润率梯度较为明显，具备通过运营抓手做结构性优化的潜力。";
  const hotel =
    hasHotelMetrics && snapshot.current.roomsAvailable > 0
      ? `酒店端出租率 ${formatPctOneDecimal(occ)}、RevPAR 约 ¥${Math.round(revpar)} 元/间夜，为量价策略与产能利用提供清晰效率坐标。`
    : "酒店效率指标在本口径下未完全覆盖，后续可补充以强化住宿业态的投资叙事。";
  return `${tier} 综合利润率 ${formatPctOneDecimal(marginPct)}。${hotel}`;
}

/** 将预警转写为「短板与改进杠杆」，避免问题导向措辞 */
export function alertToInvestorGap(a: CockpitAlertItem): string {
  if (a.desc.includes("利润为负") || a.desc.includes("亏损")) {
    return `${a.store}：利润尚处于爬坡阶段，收入与成本结构仍具备优化组合空间；建议将定价、入住/客流与成本弹性纳入一体化提升计划，以释放回报潜力。`;
  }
  if (a.desc.includes("利润率低于")) {
    return `${a.store}：利润率具备向上改善空间，可通过人效、能耗与原材料结构优化增厚利润垫，为后续扩张预留安全边际。`;
  }
  if (a.desc.includes("环比下降")) {
    return `${a.store}：利润环比出现波动，建议区分一次性因素与结构性因素，沉淀为可复制的纠偏机制，以增强业绩可预测性。`;
  }
  if (a.desc.includes("RevPAR") || a.desc.includes("平均")) {
    return `${a.store}：RevPAR 相对同批酒店仍有提升空间，可通过房价结构、渠道组合与协议客户质量优化，增强单房收入贡献。`;
  }
  return `${a.store}：${a.desc}。${a.action}`;
}

export function buildInvestorDriverNarrative(
  snapshot: CockpitSnapshot,
  deltaRevenue: number,
  deltaCost: number,
  deltaProfit: number
): string {
  if (!hasAggregateSignal(snapshot.current)) {
    return "待可比数据完善后，可进一步拆解利润变动的主要驱动因素。";
  }
  const revUp = deltaRevenue > 0;
  const costUp = deltaCost > 0;
  if (Math.abs(deltaProfit) < 1e-6) {
    return "利润与上期基本持平，收入与成本同向小幅波动，整体处于稳健平台期，为下一阶段增长蓄力。";
  }
  if (deltaProfit > 0) {
    if (revUp && !costUp)
      return "利润改善主要由收入增长与成本纪律共同支撑，属于较健康的扩张路径，具备延续动能。";
    if (revUp && costUp)
      return "利润改善来自收入增长快于成本增长，显示需求侧具备承接力；建议同步关注成本节奏，以保持改善的可持续性。";
    if (!revUp && !costUp)
      return "利润改善体现为成本优化快于收入波动，具备短期增厚回报的效果；中长期仍建议补强收入增长曲线。";
    return "利润改善由收入与成本共同塑造，具备进一步结构化拆解、识别可放大杠杆的空间。";
  }
  if (revUp && costUp)
    return "利润短期承压主要源于成本上升快于收入增长，亦意味着通过成本治理与定价策略仍可打开利润修复通道。";
  if (!revUp && costUp)
    return "收入端略有波动且成本上行，形成阶段性剪刀差；可通过稳住客源与压降可变成本，逐步恢复利润弹性。";
  if (!revUp && !costUp)
    return "收入端短期波动是主要因素，成本已同步回落，具备在需求回暖后快速修复利润的潜力。";
  return "收入与成本共同影响利润表现，建议按门店拆解贡献度，识别最具改善弹性的经营单元。";
}

export function buildGrowthOpportunityBullets(params: {
  snapshot: CockpitSnapshot;
  marginPct: number;
  tierHigh: number;
  tierMid: number;
  /** 已格式化的环比字符串，如「12.3%」 */
  revMomPct: string;
  topProfitStore: string | null;
}): string[] {
  const { snapshot, marginPct, tierHigh, tierMid, revMomPct, topProfitStore } = params;
  const cur = snapshot.current;
  const out: string[] = [];

  if (!hasAggregateSignal(cur)) {
    return [
      "数据完善后，可围绕「同店增长 + 新店爬坡 + 交叉销售」三条主线构建增长假设。",
      "建议将会员与协议客户作为提升复购与稳定收入的抓手。",
      "在成本可控前提下，可评估轻资产扩张与品牌输出的可行性。"
    ];
  }

  if (calcChange(cur.revenue, snapshot.previous.revenue) > 0) {
    out.push(`收入端环比约 ${revMomPct} 的正向动能，为同店深化与产品结构升级提供了良好窗口。`);
  } else {
    out.push("收入端仍具备通过渠道、定价与本地营销激活的增长空间。");
  }

  if (tierHigh > 0) {
    out.push(`高利润率门店（${tierHigh} 家）可作为最佳实践输出与内部赋能的「增长引擎池」。`);
  }
  if (tierMid > 0) {
    out.push(`中等利润率门店（${tierMid} 家）具备通过运营标准化迈向高利润率梯队的升级路径。`);
  }

  if (marginPct < 15 && marginPct >= 5) {
    out.push("综合利润率处于中等区间，通过效率提升兑现增量利润，对估值叙事具备边际改善价值。");
  } else if (marginPct >= 15) {
    out.push("利润率具备安全垫，可审慎评估品质投入、会员体系与数字化工具的资本化路径。");
  } else {
    out.push("利润率具备改善空间，亦意味着运营提效可转化为更清晰的利润增长故事。");
  }

  if (topProfitStore) {
    out.push(`「${topProfitStore}」等门店已验证盈利模型，具备在相似区位与客群上复制的扩张潜力。`);
  }

  return out.slice(0, 5);
}

export type RoadmapBuckets = { short: string[]; mid: string[]; long: string[] };

export function buildStrategicRoadmap(
  snapshot: CockpitSnapshot,
  marginPct: number,
  alerts: CockpitAlertItem[],
  deltaProfit: number
): RoadmapBuckets {
  const short: string[] = [];
  const mid: string[] = [];
  const long: string[] = [];

  const priority = alerts.filter((a) => a.level === "严重").length;
  const focus = alerts.filter((a) => a.level === "注意").length;

  if (!hasAggregateSignal(snapshot.current)) {
    return {
      short: ["完善数据口径与关账节奏，确保投资人与内部管理层对同一套数字对话。"],
      mid: ["建立周度经营复盘机制，将收入、利润与现金联动纳入固定议程。"],
      long: ["将增长假设与预算、激励对齐，形成可跟踪的战略里程碑体系。"]
    };
  }

  if (priority > 0) {
    short.push(
      `优先配置资源于 ${priority} 项高优先级关注门店，制定 30 天内的改善里程碑与责任机制，以提升业绩可见度。`
    );
  }
  if (focus > 0) {
    short.push(`将 ${focus} 项改进关注事项纳入管理销项清单，形成可对外沟通的执行进度表。`);
  }
  if (deltaProfit < 0) {
    short.push("在一个月内完成一次「固定费用 + 用工结构」体检，识别可延后或可优化的非关键支出，为利润修复腾挪空间。");
  }
  if (short.length === 0) {
    short.push("保持敏捷经营节奏：选取头部与潜力门店各一家做深度复盘，沉淀可复制的增长打法。");
  }

  if (marginPct < 5) {
    mid.push("一至三个月内完成人效、能耗与原材料损耗三项对标，并设定可量化改进目标，增强利润改善的可验证性。");
  } else {
    mid.push("一至三个月内优化协议客户与渠道结构，提升收入质量与毛利稳定性。");
  }
  mid.push("建立门店利润率分档滚动评级，将资本与管理资源向改善弹性更高的单元倾斜。");

  long.push("三个月以上：在盈利与现金安全边际允许的前提下，评估品牌组合、改造节奏与扩张路径，形成可路演的中长期增长叙事。");
  if (marginPct >= 15) {
    long.push("可探索会员体系、数字化与品质投入的阶段性资本化路径，以巩固溢价与复购能力。");
  }

  return { short, mid, long };
}

export const DATA_ANALYSIS_ASSET_FALLBACK = "暂无增强指标数据。";

/** Operating Leverage & Cost Discipline */
export function buildOperatingLeverageNarrative(screen: ActualDataAssetScreen): string {
  if (!screen.hasAnyEnhanced) return DATA_ANALYSIS_ASSET_FALLBACK;
  const bits: string[] = [];
  if (screen.laborCostRatioWavg != null) {
    bits.push(`人工成本率（收入加权）约 ${formatPctOneDecimal(screen.laborCostRatioWavg * 100)}`);
  }
  if (screen.energyCostRatioWavg != null) {
    bits.push(`能耗成本率约 ${formatPctOneDecimal(screen.energyCostRatioWavg * 100)}`);
  }
  if (screen.brandFeeSum != null && screen.revenueSum > 0) {
    bits.push(`品牌及技术服务相关费用合计约 ${formatWan(screen.brandFeeSum)}`);
  }
  if (screen.repairCostSum != null) {
    bits.push(`维修成本合计约 ${formatWan(screen.repairCostSum)}`);
  }
  if (bits.length === 0) {
    return "已录入部分扩展字段，与成本杠杆直接相关的指标尚不完整；建议在模板中补齐人工成本率、能耗成本率及品牌、维修等费用后，再对本段叙事做完整评估。";
  }
  return `${bits.join("；")}。从资产管理视角，当前利润改善空间主要来自成本结构优化与费用纪律，而非单纯依赖收入扩张；建议将人效、能耗与品牌相关费用纳入同一套对标与考核闭环。`;
}

/** Asset Quality & Owner Control */
export function buildAssetQualityOwnerNarrative(screen: ActualDataAssetScreen): string {
  if (!screen.hasAnyEnhanced) return DATA_ANALYSIS_ASSET_FALLBACK;
  const bits: string[] = [];
  if (screen.ocfSum != null) {
    bits.push(`经营现金流合计约 ${formatWan(screen.ocfSum)}`);
  }
  if (screen.capexSum != null) {
    bits.push(`资本开支（整改等）合计约 ${formatWan(screen.capexSum)}`);
  }
  if (screen.competitorMax != null) {
    bits.push(`同商圈新增竞品监测峰值 ${screen.competitorMax} 家`);
  }
  if (screen.reviewSum != null) {
    bits.push(`差评合计 ${screen.reviewSum} 条`);
  }
  if (screen.complaintSum != null) {
    bits.push(`投诉合计 ${screen.complaintSum} 件`);
  }
  if (screen.staffTurnoverMax != null) {
    bits.push(`员工流失率峰值约 ${formatPctOneDecimal(screen.staffTurnoverMax * 100)}`);
  }
  if (bits.length === 0) {
    return "已录入部分扩展字段，与资产质量及现金流直接相关的指标尚不完整；建议补齐经营现金流、资本开支、差评/投诉与竞品监测等字段后，再评估业主控制力叙事。";
  }
  return `${bits.join("；")}。业主侧需要加强对品牌费用、整改节奏与关键岗位稳定性的主动管理，以提升对资产现金流与运营质量的控制力。`;
}
