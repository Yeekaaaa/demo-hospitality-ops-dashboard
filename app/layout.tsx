import type { Metadata } from "next";
import "./globals.css";
import { getDefaultLocaleFromEnv } from "@/lib/i18n/types";

const defaultLocale = getDefaultLocaleFromEnv();
const htmlLang = defaultLocale === "en-US" ? "en" : "zh-CN";

export const metadata: Metadata = {
  title: "示例酒店餐饮经营管理平台",
  description: "示例酒店餐饮管理有限公司内部经营管理后台（演示）"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={htmlLang} data-default-locale={defaultLocale}>
      <body>{children}</body>
    </html>
  );
}
