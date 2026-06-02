# 河北沣庭酒店餐饮经营管理平台（首版）

企业内部经营管理后台，基于 Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui（Radix）搭建。

## 启动方式

```bash
npm install
npm run dev
```

访问：`http://localhost:3000`（默认跳转到 `/login`；登录后进入 `/dashboard`）

## 当前完成范围

- 登录页（中文）
- 后台通用布局（左侧菜单 + 顶部导航 + 主内容区）
- 首轮优先页面：
  - 首页总览
  - 酒店运营
  - 餐饮运营
  - 财务报表
  - 数据分析
- 其余菜单页面均已建立可跳转高保真静态界面

## 项目结构

```text
fengtin-admin
├─ app
│  ├─ (后台)
│  │  ├─ layout.tsx
│  │  ├─ dashboard/page.tsx
│  │  ├─ budget-management/page.tsx
│  │  ├─ hotel-operations/page.tsx
│  │  ├─ restaurant-operations/page.tsx
│  │  ├─ financial-reports/page.tsx
│  │  ├─ procurement-inventory/page.tsx
│  │  ├─ staff-scheduling/page.tsx
│  │  ├─ members-customers/page.tsx
│  │  ├─ approvals-workorders/page.tsx
│  │  ├─ data-analysis/page.tsx
│  │  └─ system-settings/page.tsx
│  ├─ login/page.tsx
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components
│  ├─ common
│  │  ├─ metric-card.tsx
│  │  └─ trend-chart.tsx
│  ├─ layout
│  │  ├─ app-shell.tsx
│  │  ├─ sidebar.tsx
│  │  └─ topbar.tsx
│  └─ ui
│     ├─ avatar.tsx
│     ├─ badge.tsx
│     ├─ button.tsx
│     ├─ card.tsx
│     ├─ checkbox.tsx
│     ├─ dropdown-menu.tsx
│     ├─ input.tsx
│     ├─ select.tsx
│     └─ table.tsx
├─ lib
│  ├─ mock-data.ts
│  ├─ mock-analytics.ts
│  ├─ store-master.ts
│  └─ utils.ts
├─ contexts
│  └─ store-period-context.tsx
├─ components.json
├─ tailwind.config.ts
└─ package.json
```

## 后续扩展建议

- 接入数据库：将 `lib/mock-data.ts` 替换为服务层调用
- 接入权限系统：在 `app/(后台)/layout.tsx` 增加鉴权中间层
- 接入 Excel 上传：新增 `app/api` 上传接口与导入任务页面
