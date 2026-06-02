# 沣庭系统数据口径冻结说明（Data Caliber Freeze）

> **状态：已冻结**  
> 本文档为 `actual_data`、`budget_data`、预算科目、KPI 计算的**唯一权威口径**。  
> 修改相关字段含义、落库目标或 KPI 公式前，**必须先更新本文档**，并同步 `lib/data-caliber.ts`、`lib/budget-canonical.ts` 顶部注释。

---

## 1. 数据源职责（永不可混用）

| 数据源 | 含义 | 写入入口 | 读取用途 |
|--------|------|----------|----------|
| **actual_data** | 实际经营结果 | 经营 Excel 导入 | Dashboard、财务报表、酒店运营、预算对比中的「实际」 |
| **budget_data** | 预算目标 | 预算管理页 / 预算 Excel | Dashboard、财务报表、酒店运营中的「预算」 |
| **budget_overrides** | 本地演示 fallback | 浏览器 localStorage | 无 Supabase 或无库内预算行时的兜底；**不得覆盖 actual_data** |

### 铁律

1. **actual_data 与 budget_data 永远分离**——禁止在同一张表、同一次导入中混写实际与预算。
2. **经营 Excel 只写 actual_data**——不得写入 `budget_data` 或预算版本字段。
3. **预算管理只写 budget_data**——不得写入 `actual_data`。
4. **Dashboard / 财务报表 / 酒店运营**——只做 **actual vs budget** 对比展示，不把预算当经营实际来源。

---

## 2. actual_data 字段口径（冻结）

| 列名 | 含义 | 单位 |
|------|------|------|
| `revenue` | 实际营业收入 | 万元 |
| `total_cost` | 实际总成本 | 万元 |
| `profit` | 实际利润 | 万元 |
| `room_revenue` | 实际客房收入 | 万元 |
| `rooms_available` | 可售房间数 | 间夜 |
| `rooms_sold` | 已售房间数 | 间夜 |

账期：`period_type` + `period_value`（与全系统 `toDbPeriod` / `reportPeriodToActualDataPeriod` 一致）。  
门店：`store_id` 为 Supabase UUID，且须在 active 经营门店池内。

---

## 3. budget_data 字段口径（冻结）

| 列名 | 含义 | 单位 | 预算管理页 canonical 科目 |
|------|------|------|-------------------------|
| `revenue_budget` | 预算营业收入 | 万元 | 总营业收入 |
| `cost_budget` | 预算总营业成本 | 万元 | 总营业成本 |
| `profit_budget` | 预算经营利润 | 万元 | 经营利润 |
| `room_revenue_budget` | 预算客房收入 | 万元 | 客房收入 |
| `rooms_available_budget` | 预算可售房间数 | 间夜 | 可售房间数 |
| `rooms_sold_budget` | 预算已售房间数 | 间夜 | 已售房间数 |

唯一键：`(store_id, period_type, period_value, budget_version)`。

**禁止在 UI 或导入中重新引入并列核心项：**

- 成本：`营业成本` / `运营成本` / `总成本` 与 `总营业成本` 并列展示（旧名仅作别名归并，见 `lib/budget-canonical.ts`）。
- 利润：`利润` / `运营利润` / `营业利润` 与 `经营利润` 并列展示。

老板核心财务口径：**总营业收入 / 总营业成本 / 经营利润**。  
酒店运营口径：**可售房间数 / 已售房间数 / 客房收入 / ADR / RevPAR**。

---

## 4. KPI 计算公式（冻结）

以下公式对 **actual** 与 **budget** 分别代入对应字段；对比类 KPI 需 actual 与 budget 成对使用。

| KPI | 公式 | 说明 |
|-----|------|------|
| **利润率** | `profit / revenue` | 分母为 0 时按业务约定返回 0 或 null |
| **出租率** | `rooms_sold / rooms_available` | 分母为 0 时为 null |
| **ADR** | `room_revenue × 10000 / rooms_sold` | `room_revenue` 为万元，ADR 为元/间夜 |
| **RevPAR** | `room_revenue × 10000 / rooms_available` | 元/可售间夜 |
| **收入完成率** | `actual revenue / budget revenue` | 对应 `revenue` vs `revenue_budget` |
| **成本预算差异** | `actual cost - budget cost` | 对应 `total_cost` vs `cost_budget`（万元） |
| **利润完成率** | `actual profit / budget profit` | 对应 `profit` vs `profit_budget` |

聚合多店时：金额类字段 **求和**；出租率、ADR、RevPAR 在聚合层按 **合计后的分子/分母** 重算，禁止对门店比率简单平均（除非产品明确要求）。

---

## 5. 代码锚点（改口径时必查）

| 文件 | 职责 |
|------|------|
| `lib/data-caliber.ts` | 表名常量、`DATA_CALIBER_RULES`、账期编码 |
| `lib/budget-canonical.ts` | 预算科目 canonical 名、别名、→ `budget_data` 列映射 |
| `src/lib/operating-data-import-supabase.ts` | 经营 Excel → **仅** `actual_data` |
| `src/lib/budget-import-to-supabase.ts` | 预算保存 → **仅** `budget_data` |
| `src/lib/budget-data-service.ts` | `budget_data` 查询与聚合 |
| `lib/actual-vs-budget-kpi.ts` | 实际 vs 预算 KPI 卡 |

---

## 6. 变更流程

1. 产品/财务确认口径变更。  
2. 更新 **本文档** 对应章节。  
3. 更新 `lib/data-caliber.ts`、`lib/budget-canonical.ts` 注释与常量（若需要）。  
4. 跑 `node scripts/verify-budget-canonical.mjs`（预算映射）及 `npm run build`。  
5. **禁止** 在未更新文档的情况下修改 Supabase 列语义或 KPI 公式。

---

*最后冻结范围：actual_data / budget_data 分离、六核心预算列、上述 KPI 公式、预算管理 canonical 科目。*
