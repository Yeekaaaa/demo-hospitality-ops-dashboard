/**
 * 经营数据导入：占比/费率解析（支持 0.31 或 31% / 31，统一为 0–1 小数）
 */

export function parseRatioOrPercentToDecimal(raw: string, label: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === "" || t === "—") return { ok: true, value: null };

  const hasPct = /%$/.test(t);
  const numPart = hasPct ? t.replace(/%$/, "").trim() : t;
  const normalized = numPart.replace(/,/g, "");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return { ok: false, error: `${label}须为数字或百分比` };
  if (n < 0) return { ok: false, error: `${label}不能为负数` };

  if (hasPct) {
    return { ok: true, value: n / 100 };
  }
  if (n > 1 && n <= 100) {
    return { ok: true, value: n / 100 };
  }
  if (n > 100) {
    return { ok: false, error: `${label}超出合理范围（请使用 0–1 小数或 ≤100 的百分数）` };
  }
  return { ok: true, value: n };
}

export function parseOptionalCount(raw: string, label: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === "" || t === "—") return { ok: true, value: null };
  const n = Number(t.replace(/,/g, ""));
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, error: `${label}须为整数` };
  if (n < 0) return { ok: false, error: `${label}不能为负数` };
  return { ok: true, value: n };
}
