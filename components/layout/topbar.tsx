"use client";

import { Bell, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveStores } from "@/contexts/active-stores-context";
import { useStorePeriod } from "@/contexts/store-period-context";
import { getActiveRestaurantStoreIds, getStoreDisplayName } from "@/lib/active-store-scope";
import { sanitizeTopbarStoreId } from "@/lib/budget-filter";
import { 全部门店值 } from "@/lib/store-master";
import {
  TOPBAR_FISCAL_MONTH_OPTIONS,
  TOPBAR_FISCAL_YEAR_OPTIONS
} from "@/lib/topbar-period-options";
import { formatStoreOptionLabel } from "@/src/lib/supabase";

/** 预算管理、财务报表使用页面内「筛选与账期」，不展示顶栏全局门店/期间 */
function shouldHideGlobalTopbarFilters(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/budget-management" ||
    pathname.startsWith("/budget-management/") ||
    pathname === "/financial-reports" ||
    pathname.startsWith("/financial-reports/")
  );
}

/** 餐饮运营页：顶栏仅展示在营餐饮门店（当前仅西北赋） */
function isRestaurantOperationsPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/restaurant-operations" || pathname.startsWith("/restaurant-operations/")
  );
}

export function Topbar() {
  const pathname = usePathname();
  const hideGlobalFilters = shouldHideGlobalTopbarFilters(pathname);
  const restaurantOpsPage = isRestaurantOperationsPath(pathname);

  const {
    storeId,
    setStoreId,
    fiscalYear,
    setFiscalYear,
    fiscalMonth,
    setFiscalMonth,
    periodLabel
  } = useStorePeriod();

  const { stores, loading: storesLoading } = useActiveStores();

  const restaurantStores = useMemo(() => {
    const restIds = new Set(getActiveRestaurantStoreIds(stores));
    return stores.filter((s) => restIds.has(s.id));
  }, [stores]);

  const restaurantStoreId = restaurantStores[0]?.id ?? null;
  const restaurantStoreLabel =
    restaurantStores[0] != null
      ? getStoreDisplayName(restaurantStores[0])
      : "西北赋";

  useEffect(() => {
    if (hideGlobalFilters || storesLoading) return;

    if (restaurantOpsPage) {
      if (restaurantStoreId && storeId !== restaurantStoreId) {
        setStoreId(restaurantStoreId);
      }
      return;
    }

    if (stores.length === 0) return;
    const next = sanitizeTopbarStoreId(storeId, stores);
    if (next !== storeId) setStoreId(next);
  }, [
    stores,
    storesLoading,
    storeId,
    setStoreId,
    hideGlobalFilters,
    restaurantOpsPage,
    restaurantStoreId
  ]);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {hideGlobalFilters ? (
            <span className="text-sm text-muted-foreground">本页使用「筛选与账期」卡片</span>
          ) : (
            <>
              <div className="min-w-[200px] max-w-[280px] flex-1 sm:flex-none">
                {restaurantOpsPage ? (
                  restaurantStores.length > 1 ? (
                    <Select value={storeId} onValueChange={setStoreId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择餐饮门店" />
                      </SelectTrigger>
                      <SelectContent>
                        {restaurantStores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {formatStoreOptionLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className="flex h-10 items-center rounded-md border bg-background px-3 text-sm font-medium"
                      aria-label="当前餐饮门店"
                    >
                      {restaurantStoreLabel}
                    </span>
                  )
                ) : (
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择门店" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={全部门店值}>全部门店</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {formatStoreOptionLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-[88px]">
                  <Select
                    value={String(fiscalYear)}
                    onValueChange={(v) => setFiscalYear(Number(v))}
                  >
                    <SelectTrigger aria-label="选择年份">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPBAR_FISCAL_YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y} 年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[88px]">
                  <Select
                    value={String(fiscalMonth)}
                    onValueChange={(v) => setFiscalMonth(Number(v))}
                  >
                    <SelectTrigger aria-label="选择月份">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPBAR_FISCAL_MONTH_OPTIONS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {String(m).padStart(2, "0")} 月
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <span className="text-xs text-muted-foreground sm:inline">
                当前账期：{periodLabel}
              </span>
              <span className="hidden text-xs text-muted-foreground lg:inline">
                经营导入以月度为主
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-blue-50 text-blue-700">权限角色：老板</Badge>
          <button className="relative rounded-full bg-white p-2 shadow-soft" type="button">
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">6</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-2 rounded-md border bg-white px-2 py-1.5">
                <Avatar>
                  <AvatarFallback>张总</AvatarFallback>
                </Avatar>
                <span className="text-sm">张明</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>个人资料</DropdownMenuItem>
              <DropdownMenuItem>账号安全</DropdownMenuItem>
              <DropdownMenuItem>退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
