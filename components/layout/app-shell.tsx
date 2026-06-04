"use client";

import { useState } from "react";
import { ActualOverridesProvider } from "@/contexts/actual-overrides-context";
import { BudgetOverridesProvider } from "@/contexts/budget-overrides-context";
import { ActiveStoresProvider } from "@/contexts/active-stores-context";
import { StorePeriodProvider } from "@/contexts/store-period-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { LocaleProvider } from "@/lib/i18n/locale-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <LocaleProvider>
    <ActualOverridesProvider>
      <BudgetOverridesProvider>
        <ActiveStoresProvider>
          <StorePeriodProvider>
            <div className="flex min-h-screen bg-background">
              <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
              <div className="flex flex-1 flex-col">
                <Topbar />
                <main className="flex-1 p-6">{children}</main>
              </div>
            </div>
          </StorePeriodProvider>
        </ActiveStoresProvider>
      </BudgetOverridesProvider>
    </ActualOverridesProvider>
    </LocaleProvider>
  );
}
