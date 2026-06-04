"use client";

import { LocaleProvider } from "@/lib/i18n/locale-context";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
