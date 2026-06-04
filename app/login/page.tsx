"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Lock, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n/locale-context";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-2">
      <section className="flex flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-10 text-white lg:p-16">
        <p className="mb-4 inline-flex w-fit items-center rounded-full border border-white/20 px-3 py-1 text-xs">
          <Building2 className="mr-1.5 h-3.5 w-3.5" />
          {t("auth.login.badge")}
        </p>
        <h1 className="text-3xl font-bold leading-tight">{t("auth.login.companyName")}</h1>
        <h2 className="mt-3 text-2xl font-semibold text-blue-100">{t("auth.login.productName")}</h2>
        <p className="mt-6 max-w-lg text-sm leading-7 text-slate-200">{t("auth.login.tagline")}</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">{t("auth.login.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("auth.login.accountLabel")}</label>
              <div className="relative">
                <UserCircle2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input placeholder={t("auth.login.accountPlaceholder")} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("auth.login.passwordLabel")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder={t("auth.login.passwordPlaceholder")}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox id="remember" defaultChecked />
                {t("auth.login.remember")}
              </label>
              <Link href="#" className="text-primary hover:underline">
                {t("auth.login.forgotPassword")}
              </Link>
            </div>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              {t("auth.login.submit")}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
