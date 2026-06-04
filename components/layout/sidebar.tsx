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
import { t } from "@/lib/i18n/get-message";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItemDef = {
  labelKey: string;
  path: string;
  icon: LucideIcon;
};

type NavGroupDef = {
  groupKey: string;
  items: NavItemDef[];
};

/** 按经营管理逻辑分组；路径与业务逻辑勿随意改动 */
const NAV_MENU: NavGroupDef[] = [
  {
    groupKey: "nav.groups.cockpit",
    items: [
      { labelKey: "nav.items.dashboard", path: "/dashboard", icon: LayoutGrid },
      { labelKey: "nav.items.dataAnalysis", path: "/data-analysis", icon: BarChart3 },
      { labelKey: "nav.items.riskAlerts", path: "/risk-alerts", icon: ShieldAlert }
    ]
  },
  {
    groupKey: "nav.groups.operations",
    items: [
      { labelKey: "nav.items.hotelOperations", path: "/hotel-operations", icon: Hotel },
      {
        labelKey: "nav.items.restaurantOperations",
        path: "/restaurant-operations",
        icon: Soup
      }
    ]
  },
  {
    groupKey: "nav.groups.finance",
    items: [
      { labelKey: "nav.items.financialReports", path: "/financial-reports", icon: Wallet },
      { labelKey: "nav.items.budgetManagement", path: "/budget-management", icon: PieChart }
    ]
  },
  {
    groupKey: "nav.groups.execution",
    items: [
      { labelKey: "nav.items.issueTracking", path: "/issue-tracking", icon: ListTodo },
      { labelKey: "nav.items.storeInspection", path: "/store-inspection", icon: ClipboardList },
      {
        labelKey: "nav.items.approvalsWorkorders",
        path: "/approvals-workorders",
        icon: ClipboardCheck
      }
    ]
  },
  {
    groupKey: "nav.groups.resources",
    items: [
      {
        labelKey: "nav.items.procurementInventory",
        path: "/procurement-inventory",
        icon: ShoppingCart
      },
      { labelKey: "nav.items.staffScheduling", path: "/staff-scheduling", icon: Users },
      { labelKey: "nav.items.membersCustomers", path: "/members-customers", icon: Building2 }
    ]
  },
  {
    groupKey: "nav.groups.data",
    items: [
      {
        labelKey: "nav.items.operatingDataTemplate",
        path: "/operating-data-template",
        icon: FileSpreadsheet
      }
    ]
  },
  {
    groupKey: "nav.groups.system",
    items: [{ labelKey: "nav.items.systemSettings", path: "/system-settings", icon: Settings }]
  }
];

function isActivePath(pathname: string, path: string): boolean {
  return pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
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
            <p className="text-sm font-semibold">{t("nav.brandTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("nav.brandSubtitle")}</p>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onToggle}>
          {collapsed ? t("nav.expand") : t("nav.collapse")}
        </Button>
      </div>
      <nav className="space-y-0">
        {NAV_MENU.map((group, groupIndex) => (
          <div key={group.groupKey} className={cn(groupIndex > 0 && (collapsed ? "mt-3" : "mt-5"))}>
            {!collapsed && (
              <p
                className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                aria-hidden
              >
                {t(group.groupKey)}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={`${group.groupKey}-${item.path}`}
                    href={item.path as Route}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary text-white"
                        : "text-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{t(item.labelKey)}</span>}
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
