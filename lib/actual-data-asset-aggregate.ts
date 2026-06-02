/**
 * actual_data 多行聚合：用于投融资分析「经营杠杆 / 资产质量」叙事
 */

export type ActualDataAssetScreen = {
  hasAnyEnhanced: boolean;
  revenueSum: number;
  /** 人工成本率（有加权则用占比加权和，否则用 Σ人工/Σ收入） */
  laborCostRatioWavg: number | null;
  energyCostRatioWavg: number | null;
  brandFeeSum: number | null;
  repairCostSum: number | null;
  marketingSum: number | null;
  reservationMemberFeeSum: number | null;
  ocfSum: number | null;
  capexSum: number | null;
  netCashSum: number | null;
  competitorMax: number | null;
  reviewSum: number | null;
  complaintSum: number | null;
  staffTurnoverMax: number | null;
  gopMarginWavg: number | null;
};

function nn(row: Record<string, unknown>, k: string): number | null {
  const v = row[k];
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ratio01(v: number | null): number | null {
  if (v == null) return null;
  return v > 1 ? v / 100 : v;
}

export function summarizeActualDataAssetRows(rows: Record<string, unknown>[]): ActualDataAssetScreen {
  let revenueSum = 0;
  let laborWNum = 0;
  let laborWDen = 0;
  let laborCostSum = 0;
  let laborRevSum = 0;
  let energyWNum = 0;
  let energyWDen = 0;
  let energyCostSum = 0;
  let energyRevSum = 0;
  let gopNum = 0;
  let gopDen = 0;
  let brandSum = 0;
  let brandHas = false;
  let repairSum = 0;
  let repairHas = false;
  let mktSum = 0;
  let mktHas = false;
  let resFeeSum = 0;
  let resFeeHas = false;
  let ocfSum = 0;
  let ocfHas = false;
  let capexSum = 0;
  let capexHas = false;
  let netCashSum = 0;
  let netCashHas = false;
  let compMax: number | null = null;
  let revSum = 0;
  let revRows = 0;
  let compSum = 0;
  let compRows = 0;
  let staffMax: number | null = null;
  let enhanced = false;

  for (const r of rows) {
    const rev = nn(r, "revenue") ?? 0;
    revenueSum += rev;

    const lcr = ratio01(nn(r, "labor_cost_ratio"));
    const lc = nn(r, "labor_cost");
    if (lcr != null && rev > 0) {
      laborWNum += lcr * rev;
      laborWDen += rev;
      enhanced = true;
    } else if (lc != null && rev > 0) {
      laborCostSum += lc;
      laborRevSum += rev;
      enhanced = true;
    }

    const ecr = ratio01(nn(r, "energy_cost_ratio"));
    const ec = nn(r, "energy_cost");
    if (ecr != null && rev > 0) {
      energyWNum += ecr * rev;
      energyWDen += rev;
      enhanced = true;
    } else if (ec != null && rev > 0) {
      energyCostSum += ec;
      energyRevSum += rev;
      enhanced = true;
    }

    const gm = ratio01(nn(r, "gop_margin"));
    if (gm != null && rev > 0) {
      gopNum += gm * rev;
      gopDen += rev;
      enhanced = true;
    }

    const bf = nn(r, "brand_fee");
    if (bf != null) {
      brandSum += bf;
      brandHas = true;
      enhanced = true;
    }
    const rp = nn(r, "repair_cost");
    if (rp != null) {
      repairSum += rp;
      repairHas = true;
      enhanced = true;
    }
    const mk = nn(r, "marketing_cost");
    if (mk != null) {
      mktSum += mk;
      mktHas = true;
      enhanced = true;
    }
    const rf = nn(r, "reservation_member_fee");
    if (rf != null) {
      resFeeSum += rf;
      resFeeHas = true;
      enhanced = true;
    }
    const ocf = nn(r, "operating_cash_flow");
    if (ocf != null) {
      ocfSum += ocf;
      ocfHas = true;
      enhanced = true;
    }
    const cx = nn(r, "capex");
    if (cx != null) {
      capexSum += cx;
      capexHas = true;
      enhanced = true;
    }
    const nc = nn(r, "net_cash_flow");
    if (nc != null) {
      netCashSum += nc;
      netCashHas = true;
      enhanced = true;
    }
    const comp = nn(r, "nearby_new_competitor_count");
    if (comp != null) {
      compMax = compMax == null ? comp : Math.max(compMax, comp);
      enhanced = true;
    }
    const rv = nn(r, "negative_review_count");
    if (rv != null) {
      revSum += rv;
      revRows += 1;
      enhanced = true;
    }
    const cp = nn(r, "complaint_count");
    if (cp != null) {
      compSum += cp;
      compRows += 1;
      enhanced = true;
    }
    const st = ratio01(nn(r, "staff_turnover_rate"));
    if (st != null) {
      staffMax = staffMax == null ? st : Math.max(staffMax, st);
      enhanced = true;
    }
  }

  const laborFromRatio = laborWDen > 0 ? laborWNum / laborWDen : null;
  const laborFromCost = laborRevSum > 0 ? laborCostSum / laborRevSum : null;
  const laborCostRatioWavg = laborFromRatio ?? laborFromCost;

  const energyFromRatio = energyWDen > 0 ? energyWNum / energyWDen : null;
  const energyFromCost = energyRevSum > 0 ? energyCostSum / energyRevSum : null;
  const energyCostRatioWavg = energyFromRatio ?? energyFromCost;

  return {
    hasAnyEnhanced: enhanced,
    revenueSum,
    laborCostRatioWavg,
    energyCostRatioWavg,
    brandFeeSum: brandHas ? brandSum : null,
    repairCostSum: repairHas ? repairSum : null,
    marketingSum: mktHas ? mktSum : null,
    reservationMemberFeeSum: resFeeHas ? resFeeSum : null,
    ocfSum: ocfHas ? ocfSum : null,
    capexSum: capexHas ? capexSum : null,
    netCashSum: netCashHas ? netCashSum : null,
    competitorMax: compMax,
    reviewSum: revRows > 0 ? revSum : null,
    complaintSum: compRows > 0 ? compSum : null,
    staffTurnoverMax: staffMax,
    gopMarginWavg: gopDen > 0 ? gopNum / gopDen : null
  };
}
