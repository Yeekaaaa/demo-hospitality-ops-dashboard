"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Lock, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-2">
      <section className="flex flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-10 text-white lg:p-16">
        <p className="mb-4 inline-flex w-fit items-center rounded-full border border-white/20 px-3 py-1 text-xs">
          <Building2 className="mr-1.5 h-3.5 w-3.5" />
          企业内部经营管理系统
        </p>
        <h1 className="text-3xl font-bold leading-tight">河北沣庭酒店管理有限公司</h1>
        <h2 className="mt-3 text-2xl font-semibold text-blue-100">河北沣庭酒店餐饮经营管理平台</h2>
        <p className="mt-6 max-w-lg text-sm leading-7 text-slate-200">
          统一管理酒店与餐饮经营数据，提升经营效率与决策能力。系统面向老板、财务、店长、餐厅经理与管理人员提供稳定、高效、可追溯的数据工作台。
        </p>
      </section>
      <section className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">欢迎登录</CardTitle>
            <p className="text-sm text-muted-foreground">请输入账号与密码进入经营管理平台</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">账号</label>
              <div className="relative">
                <UserCircle2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input placeholder="请输入账号" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input type="password" placeholder="请输入密码" className="pl-9" />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox id="remember" defaultChecked />
                记住登录状态
              </label>
              <Link href="#" className="text-primary hover:underline">
                忘记密码
              </Link>
            </div>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              登录系统
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
