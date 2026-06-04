# 示例酒店餐饮经营管理平台

面向酒店与餐饮的多门店经营数据管理后台（**Demo / Portfolio**）。仓库内公司名、门店名、人员与示例金额均为**虚构**，仅供界面与数据口径演示，不代表任何真实经营主体。

## 项目说明

- **定位**：企业内部经营驾驶舱原型，展示 KPI、趋势、预算对比、经营导入与智能图表推荐等能力。
- **数据模式**：未配置 Supabase 时使用本地演示数据；配置后可在有数据时展示库内经营/预算，无数据或不可用时仍回退演示并显示数据来源提示条。
- **语言**：默认中文（`zh-CN`）；顶栏可切换部分界面为英文。GitHub / Vercel 公开演示可在环境变量中设置 `NEXT_PUBLIC_DEFAULT_LOCALE=en-US`（首次访问、无本地偏好时生效）。
- **金额口径**：库内与聚合计算底层单位为**元**；Dashboard、财务报表等大额展示通过 `formatWan` 等形式显示为**万元**（仅展示层 ÷ 10000）。

## 技术栈

- [Next.js](https://nextjs.org/) 15（App Router）
- React 19 + TypeScript
- Tailwind CSS + Radix / shadcn 风格组件
- [Recharts](https://recharts.org/) 图表
- [Supabase](https://supabase.com/)（可选，浏览器端 `anon` key）

## 本地运行

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local：可留空 Supabase 项，直接以演示数据体验
npm run dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)（默认 `/login`，登录后进入 `/dashboard`）。

生产构建：

```bash
npm run build
npm run start
```

## 环境变量

复制 [.env.example](.env.example) 为 `.env.local`（**勿将 `.env.local` 提交到 Git**）。

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 可选。Supabase 项目 URL，占位符即可本地跑通演示。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 可选。Supabase **anon** 公钥；**不要**使用 service role key。 |
| `NEXT_PUBLIC_DEMO_MODE` | 可选预留。公开演示建议保持 `1`；当前行为以未配置 Supabase / 无数据时的演示回退为主。 |
| `NEXT_PUBLIC_DEMO_USER_NAME` | 可选预留。顶栏演示用户显示名（未接线时以界面内置「演示用户」为准）。 |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | 可选。`zh-CN`（默认）或 `en-US`。未配置或非法值时回退 `zh-CN`。中文业务部署保持默认即可；Vercel Portfolio 演示建议 `en-US`。用户曾在顶栏切换的语言会写入 `localStorage['fengtin-locale']`，刷新后优先于本变量。 |

不配置 Supabase 时，各页以 mock / 演示数据运行，页面顶部会提示「演示数据」。

### 语言与英文覆盖范围

- **中文业务系统**：不设置 `NEXT_PUBLIC_DEFAULT_LOCALE`，或设为 `zh-CN`。
- **公开演示（如 Vercel）**：在 Project → Environment Variables 添加 `NEXT_PUBLIC_DEFAULT_LOCALE` = `en-US`，重新部署后生效。
- **优先级**：`localStorage['fengtin-locale']`（用户手动切换）→ `NEXT_PUBLIC_DEFAULT_LOCALE` → `zh-CN`。
- **当前英文文案范围**：侧栏、登录、数据来源 Banner、智能图表推荐等；驾驶舱、运营、财务报表、预算等复杂业务页仍以中文为主。

## 主要功能（演示范围）

- 经营驾驶舱、酒店运营、餐饮运营、财务报表、预算管理、经营数据模板导入
- 实际数据（`actual_data`）与预算数据（`budget_data`）分离；经营数据按月账期导入
- 数据来源 Banner：区分真实经营/预算与演示回退
- Smart Chart：规则推荐图表类型（不替代现有图表控件时可显示推荐徽章 / 预览说明）
- 部分菜单页为高保真静态占位，可持续扩展

## 数据口径摘要

- **金额**：存储与 KPI 聚合为**元**；前端大额常用万元展示。
- **账期**：经营导入以月度为主，与 Excel 模板 `month` + `YYYY-MM` 一致。
- **门店**：演示主数据见 `lib/store-master.ts`（示例酒店 A/B/C、示例餐厅、示例城市）。
- **开业账期**：`lib/store-opening-periods.ts` 使用 mock id / 显示名映射；**请勿**在公开仓库提交真实 `store_id` UUID。

更完整的口径说明见 [docs/data-caliber-freeze.md](docs/data-caliber-freeze.md)（库列 `huazhu_management_fee` 等为历史内部键，界面与模板展示为「品牌管理费」）。

## 验收与检查脚本

```bash
npm run build
npm run lint
npx tsx scripts/acceptance-check.ts
npx tsx scripts/i18n-dictionary-check.ts
npx tsx scripts/smart-chart-recommend-check.ts
npx tsx scripts/smart-chart-renderer-check.ts
```

## 安全与公开仓库须知

- **不要**提交 `.env.local`、真实 Supabase URL、真实 anon key 或 **service role** key。
- **不要**在 Issue / PR 中粘贴真实门店、真实财务数据或生产库 UUID。
- `sql/` 与 `supabase/migrations/` 仅含表结构 DDL，不含真实 seed 数据。
- `.agents/`、`.cursor/` 等为本地 Agent 配置，**未纳入**本仓库业务发布范围。

## 仓库结构（简）

```text
app/                 # 页面与路由（登录 + 后台）
components/          # UI、布局、图表、数据来源 Banner
lib/                 # 业务规则、mock、i18n、Smart Chart、门店主数据
contexts/            # 门店账期、Supabase 数据上下文等
scripts/             # 验收与规则检查脚本
supabase/migrations/ # 可选自托管时的 schema 迁移
```

## 许可证与用途

本项目用于技术展示与学习。fork 或演示时请保持虚构命名，勿替换为真实客户信息后再公开。
