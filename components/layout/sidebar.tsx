"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  Hotel,
  LayoutGrid,
  ListTodo,
  PieChart,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Soup,
  Users,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type 菜单项 = {
  名称: string;
  路径: string;
  图标: LucideIcon;
};

type 菜单分组 = {
  分组标题: string;
  项: 菜单项[];
};

/** 按经营管理逻辑分组；路径与业务逻辑勿随意改动 */
const 分组菜单: 菜单分组[] = [
  {
    分组标题: "经营驾驶舱",
    项: [
      { 名称: "首页总览", 路径: "/dashboard", 图标: LayoutGrid },
      { 名称: "经营增长分析", 路径: "/data-analysis", 图标: BarChart3 },
      { 名称: "异常预警中心", 路径: "/risk-alerts", 图标: ShieldAlert }
    ]
  },
  {
    分组标题: "业务运营",
    项: [
      { 名称: "酒店运营", 路径: "/hotel-operations", 图标: Hotel },
      { 名称: "餐饮运营", 路径: "/restaurant-operations", 图标: Soup }
    ]
  },
  {
    分组标题: "财务管理",
    项: [
      { 名称: "财务报表", 路径: "/financial-reports", 图标: Wallet },
      { 名称: "预算管理", 路径: "/budget-management", 图标: PieChart }
    ]
  },
  {
    分组标题: "执行管理",
    项: [
      { 名称: "问题闭环追踪", 路径: "/issue-tracking", 图标: ListTodo },
      { 名称: "巡店检查表", 路径: "/store-inspection", 图标: ClipboardList },
      { 名称: "审批与工单", 路径: "/approvals-workorders", 图标: ClipboardCheck }
    ]
  },
  {
    分组标题: "资源管理",
    项: [
      { 名称: "采购库存", 路径: "/procurement-inventory", 图标: ShoppingCart },
      { 名称: "员工与排班", 路径: "/staff-scheduling", 图标: Users },
      { 名称: "会员与客户", 路径: "/members-customers", 图标: Building2 }
    ]
  },
  {
    分组标题: "数据管理",
    项: [{ 名称: "经营数据模板", 路径: "/operating-data-template", 图标: FileSpreadsheet }]
  },
  {
    分组标题: "系统",
    项: [{ 名称: "系统设置", 路径: "/system-settings", 图标: Settings }]
  }
];

function 是否当前路径(pathname: string, 路径: string): boolean {
  return pathname === 路径 || (路径 !== "/" && pathname.startsWith(`${路径}/`));
}

export function Sidebar({
  collapsed,
  onToggle
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen border-r bg-white px-3 py-4 transition-all",
        collapsed ? "w-[76px]" : "w-[248px]"
      )}
    >
      <div className="mb-6 flex items-center justify-between px-2">
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold">河北沣庭酒店餐饮</p>
            <p className="text-xs text-muted-foreground">经营管理平台</p>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onToggle}>
          {collapsed ? "展开" : "收起"}
        </Button>
      </div>
      <nav className="space-y-0">
        {分组菜单.map((group, groupIndex) => (
          <div key={group.分组标题} className={cn(groupIndex > 0 && (collapsed ? "mt-3" : "mt-5"))}>
            {!collapsed && (
              <p
                className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                aria-hidden
              >
                {group.分组标题}
              </p>
            )}
            <div className="space-y-1">
              {group.项.map((item) => {
                const 当前 = 是否当前路径(pathname, item.路径);
                const Icon = item.图标;
                return (
                  <Link
                    key={`${group.分组标题}-${item.路径}`}
                    href={item.路径 as Route}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      当前
                        ? "bg-primary text-white"
                        : "text-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.名称}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-6 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 text-foreground">
          <BellRing className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>系统提醒</span>}
        </div>
        {!collapsed && <p>本月 3 家门店利润率达成目标，建议继续优化能源成本。</p>}
      </div>
      <div className="mt-3 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 text-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>报表更新</span>}
        </div>
        {!collapsed && <p>财务报表每日 08:00 自动刷新，可导出月度经营数据。</p>}
      </div>
    </aside>
  );
}
