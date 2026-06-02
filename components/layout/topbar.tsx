"use client";

import { Bell, CalendarDays, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveStores } from "@/contexts/active-stores-context";
import { useStorePeriod } from "@/contexts/store-period-context";
import { sanitizeTopbarStoreId } from "@/lib/budget-filter";
import { 全部门店值 } from "@/lib/store-master";
import type { PeriodGranularity } from "@/lib/mock-analytics";
import { formatStoreOptionLabel } from "@/src/lib/supabase";

const 时间选项: { value: PeriodGranularity; label: string }[] = [
  { value: "month", label: "本月" },
  { value: "quarter", label: "本季度" },
  { value: "year", label: "本年度" }
];

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

export function Topbar() {
  const pathname = usePathname();
  const hideGlobalFilters = shouldHideGlobalTopbarFilters(pathname);

  const {
    storeId,
    setStoreId,
    periodGranularity,
    setPeriodGranularity,
    periodLabel
  } = useStorePeriod();

  const { stores, loading: storesLoading } = useActiveStores();

  useEffect(() => {
    if (hideGlobalFilters || storesLoading || stores.length === 0) return;
    const next = sanitizeTopbarStoreId(storeId, stores);
    if (next !== storeId) setStoreId(next);
  }, [stores, storesLoading, storeId, setStoreId, hideGlobalFilters]);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {hideGlobalFilters ? (
            <span className="text-sm text-muted-foreground">本页使用「筛选与账期」卡片</span>
          ) : (
            <>
              <div className="min-w-[220px] max-w-[280px]">
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
              </div>
              <div className="w-44">
                <Select
                  value={periodGranularity}
                  onValueChange={(v) => setPeriodGranularity(v as PeriodGranularity)}
                >
                  <SelectTrigger>
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {时间选项.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">当前账期：{periodLabel}</span>
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
