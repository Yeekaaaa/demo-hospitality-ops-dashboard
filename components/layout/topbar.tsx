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
import { useLocale } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/types";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

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

/** 餐饮运营页：顶栏仅展示在营餐饮门店（当前仅示例餐厅） */
function isRestaurantOperationsPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/restaurant-operations" || pathname.startsWith("/restaurant-operations/")
  );
}

const selectTriggerClass = "h-10";

export function Topbar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
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
      : "示例餐厅";

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
    <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-2.5 backdrop-blur sm:px-6 sm:py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
          {hideGlobalFilters ? (
            <span className="text-sm text-muted-foreground">本页使用页面内「筛选与账期」</span>
          ) : (
            <>
              <div className="w-full min-w-[180px] max-w-[280px] sm:w-auto sm:flex-none">
                {restaurantOpsPage ? (
                  restaurantStores.length > 1 ? (
                    <Select value={storeId} onValueChange={setStoreId}>
                      <SelectTrigger className={selectTriggerClass}>
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
                      className={cn(
                        "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm"
                      )}
                      aria-label="当前餐饮门店"
                    >
                      {restaurantStoreLabel}
                    </span>
                  )
                ) : (
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger className={selectTriggerClass}>
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

              <div
                className="flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-muted/30 px-2 py-1"
                title="经营数据导入以月度账期为主，请与 Excel 模板中的账期一致"
              >
                <div className="w-[84px] shrink-0 sm:w-[88px]">
                  <Select
                    value={String(fiscalYear)}
                    onValueChange={(v) => setFiscalYear(Number(v))}
                  >
                    <SelectTrigger className={cn(selectTriggerClass, "bg-background")} aria-label="选择年份">
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
                <div className="w-[84px] shrink-0 sm:w-[88px]">
                  <Select
                    value={String(fiscalMonth)}
                    onValueChange={(v) => setFiscalMonth(Number(v))}
                  >
                    <SelectTrigger className={cn(selectTriggerClass, "bg-background")} aria-label="选择月份">
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
                <span className="shrink-0 px-1 text-sm font-semibold tabular-nums text-foreground">
                  账期 {periodLabel}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="w-[108px] shrink-0 sm:w-[112px]">
            <Select
              value={locale}
              onValueChange={(value) => setLocale(value as Locale)}
            >
              <SelectTrigger className={selectTriggerClass} aria-label={t("locale.label")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code === "zh-CN" ? t("locale.zhCN") : t("locale.enUS")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge className="hidden bg-blue-50 text-blue-800 sm:inline-flex">
            老板
          </Badge>
          <button
            className="relative rounded-full border bg-background p-2 shadow-sm transition-colors hover:bg-muted/50"
            type="button"
            aria-label="通知"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
              6
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 shadow-sm transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">演示</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">演示用户</span>
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
