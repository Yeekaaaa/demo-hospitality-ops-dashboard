import { AppShell } from "@/components/layout/app-shell";

export default function 后台布局({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
