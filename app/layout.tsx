import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "示例酒店餐饮经营管理平台",
  description: "示例酒店餐饮管理有限公司内部经营管理后台（演示）"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
